import { yupResolver } from '@hookform/resolvers/yup';
import React, { FocusEventHandler, JSXElementConstructor, useCallback, useEffect, useState } from 'react';
import { SubmitErrorHandler, SubmitHandler, useForm, UseFormProps, UseFormReturn } from 'react-hook-form';
import { ErrorFeedbackBox, ErrorFeedbackBoxProps } from '../../feedback-box/feedback-box.component';
import { Buttons, ButtonsProps } from '../../navigation/buttons/buttons.component';
import { BaseCommonInputProps, RHFInputType } from '../inputs/base/base-input.types';
import { Watch, WatchProps } from '../watch/watch.component';
import { FormArrayInput } from './form-array-input/form-array-input.component';
import { FormControlledInput } from './form-controlled-input/form-controlled-input.component';
import { FormInput } from './form-input/form-input.component';
import { FormNativeInput } from './form-native-input/form-native-input.component';
import styles from './form.module.scss';

interface InjectableFormElement<P = any, U = undefined> {
  type: JSXElementConstructor<any> & { rhfInputType: U };
  props: P;
  key: string | number | null;
}

const NATIVE_INPUTS = ['input', 'textarea', 'select'];

function isNativeInput<P = any>(child: any): child is InjectableFormElement<P & { name: string }, undefined> {
  return React.isValidElement<P>(child) && typeof child.type === 'string' && NATIVE_INPUTS.includes(child.type) && (child.props as any).hasOwnProperty('name');
}

function isCustomInput<P = any>(child: any): child is InjectableFormElement<P & { name: string }, RHFInputType> {
  return React.isValidElement<P>(child) && typeof child.type !== 'string' && child.type.hasOwnProperty('rhfInputType') && (child.props as any).hasOwnProperty('name');
}

function isInjectableInput<P = any>(child: any): child is InjectableFormElement<P & { name: string }, undefined | RHFInputType> {
  return isNativeInput<P>(child) || isCustomInput<P>(child);
}

export type FormFieldFocusHandler = FocusEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export interface FormClassNames {
  form?: string;
  input?: string;
  arrayInput?: string;
  comboInput?: string;
  controlledInput?: string;
  errorBox?: string;
  debugBox?: string;
}

export interface BaseFormProps<T = any> {
  // Styling:
  formId?: string;
  className?: string;
  classNames?: FormClassNames;

  // Data:
  isLoading?: boolean;
  defaultValues?: UseFormProps<T>['defaultValues'];

  // Events:
  onBlur?: FormFieldFocusHandler;
  // TODO: Optionally return promise to indicate fields are being saved...
  onChange?: (formValues: T, name: string) => void;
  onSubmit?: SubmitHandler<T>;
  confirmLeaving?: boolean;

  // Debug:
  debug?: boolean;
}

// export interface FormPropsWithOptions<T = any> extends BaseFormProps<T>, UseFormProps {
export interface FormPropsWithOptions<T = any> extends BaseFormProps<T>, Omit<UseFormProps, keyof BaseFormProps> {
  validationSchema?: any;
  // TODO: Add property to get form methods outside.
}

export interface FormPropsWithMethods<T = any> extends BaseFormProps<T> {
  formMethods?: UseFormReturn<T>;
}

export type FormProps = FormPropsWithOptions | FormPropsWithMethods;


/**
 * Magic/Smart Form component that clones children while passing them the register function and some other form state
 * variables automatically. Performance should be better than using FormProvider, which will re-render all the form on
 * each change.
 *
 * When passing a formId, it will use `useFormPersist` to persist form values in LocalStorage. Note that forces the
 * whole form to re-render on each change, so there's a performance penalty for using it, specially on large forms. A
 * better alternative would be to implement a custom hook that only persists form values at regular intervals and/or
 * onbeforeunload and optionally includes an expiration date.
 *
 * TODO: Add deps and getProps props to inputs so that they can compute properties based on other fields' values without
 * re-rendering the whole form. Then each input's parent Control can use useWatch and merges the props, so that each
 * field get its own isolate render.
 *
 * TODO: Persist form values when closing page.
 *
 * @see https://react-hook-form.com/advanced-usage#SmartFormComponent
 * @see https://react-hook-form.com/advanced-usage#FormProviderPerformance
 */

// TODO: Missing generic type here:
export const RHMFForm: React.FunctionComponent<FormProps> = (props) => {
  const {
    formId,
    className,
    classNames = { },
    isLoading,
    defaultValues,
    onBlur,
    onChange,
    onSubmit,
    confirmLeaving,
    debug,
    children,
    ...useFormOptions
  } = props;
  const validationSchema = 'validationSchema' in props ? props.validationSchema : undefined;
  const methods = useForm({
    ...useFormOptions,
    defaultValues,
    resolver: validationSchema ? yupResolver(validationSchema) : undefined,
  });
  const { register, handleSubmit, watch, formState, reset, control } = ('formMethods' in props && props.formMethods) || methods;
  const { errors } = formState;
  const [formError, setFormError] = useState<Error | true | undefined>(undefined);

  useEffect(() => {
    if (defaultValues !== undefined) {
      // TODO: This should not happen on first render.
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    if (confirmLeaving) return;

    console.log('CONFIRM LEAVING');

    function handleBeforeUnload(e) {
      if (formState.isSubmitSuccessful || !formState.isDirty) return;

      // Returning a custom messages also don't seem to be supported anymore.
      // See https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload.

      e.preventDefault();

      e.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [confirmLeaving, formState]);

  const wrappedOnSubmit: SubmitHandler<any> = useCallback(async (...args) => {
    setFormError(undefined);

    if (!onSubmit) return;

    try {
      const result = await onSubmit(...args);

      return result;
    } catch (err) {
      if (debug) console.log('RHMF > Submit Error', err);

      setFormError(err);
    }
  }, [onSubmit, debug]);

  const onError: SubmitErrorHandler<any> = useCallback(() => {
    setFormError(true);
  }, []);

  let hasErrorBox = false;

  let errorMessage: Error | string | undefined;

  if (formError === true && Object.keys(errors).length > 0) {
    errorMessage = 'Please, review the errors in the fields above.';
  } else if (formError instanceof Error) {
    errorMessage = formError;
  }

  const handleChange = useCallback((name: string) => {
    if (!onChange) return;

    // This callback gets called before react-hook-form values are updated, so calling watch() immediately would return
    // the values BEFORE the update happened:
    // TODO: Potentially return previous values:
    setImmediate(() => onChange(watch(), name));
  }, [watch, onChange]);

  useEffect(() => {
    if (!debug || Object.keys(errors).length === 0) return;

    console.log('RHMF > Errors', errors);
  }, [debug, errors]);

  function injectFormProps(children: React.ReactNode, recursive = false) {
    return React.Children.map(children, (child) => {
      // TODO: Enforce this with types or having 2 different variations of the same input:
      // TODO: Move these checks to the form component:
      // if (process.env.DEV && register && rawValue) {
      //   logger.warn(`Found a ${ label } input field with both 'value' and 'register' props.`);
      // }

      if (isInjectableInput<BaseCommonInputProps>(child)) {
        const { type, props } = child;
        const { rhfInputType } = type;
        const { name } = props;
        const disabled = isLoading || formState.isSubmitting || props.disabled; // TODO: Move outside injectFormProps function.
        const fieldErrors = errors[name];
        const hasMultipleErrors = Array.isArray(fieldErrors);

        // TODO: Improves these checks and types:

        if (rhfInputType === 'array') {
          return (
            <FormArrayInput
              type={ type }
              parentProps={ props }
              disabled={ disabled }
              error={ hasMultipleErrors ? undefined : fieldErrors }
              errors={ hasMultipleErrors ? fieldErrors : undefined }
              onBlur={ onBlur }
              register={ register }
              control={ control } />
          );
        } else if (rhfInputType === 'controlled') {
          return (
            <FormControlledInput
              type={ type }
              parentProps={ props }
              disabled={ disabled }
              onBlur={ onBlur }
              onChange={ onChange ? handleChange : undefined }
              control={ control } />
          );
        } else if (isNativeInput<BaseCommonInputProps>(child)) {
          return (
            <FormNativeInput
              type={ type }
              parentProps={ props }
              disabled={ disabled }
              // error={ fieldErrors }
              onBlur={ onBlur }
              onChange={ onChange ? handleChange : undefined }
              register={ register } />
          );
        } else {
          return (
            <FormInput
              type={ type }
              parentProps={ props }
              disabled={ disabled }
              error={ fieldErrors }
              onBlur={ onBlur }
              onChange={ onChange ? handleChange : undefined }
              register={ register } />
          );
        }
      }

      if (!React.isValidElement(child)) return child;

      const { type, props } = child;

      // TODO: Everything below should be configurable:

      if (type === Buttons) {
        return React.createElement(type, to<ButtonsProps>({
          ...props,
          submitDisabled: isLoading,
          isSubmitting: formState.isSubmitting,
        }));
      }

      if (type === ErrorFeedbackBox) {
        hasErrorBox = true;

        // TODO: Should we pass all errors?

        return React.createElement(type, to<ErrorFeedbackBoxProps>({
          ...props,
          error: errorMessage,
        }));
      }

      if (type === Watch) {
        return React.createElement(type, to<WatchProps>({
          ...props,
          control,
        }));
      }

      if (recursive && props.children) {
        return React.createElement(type, props, ...injectFormProps(props.children));
      }

      return child;
    });
  }

  // Note: FormProvider is not good for performance, as now the whole form will re-render on each change:
  // See: https://react-hook-form.com/advanced-usage#FormProviderPerformance

  return (
    <form
      id={ formId }
      className={ [classNames.form, className].join(' ') }
      onSubmit={ handleSubmit(wrappedOnSubmit, onError) }>

      { injectFormProps(children, true) }

      { !hasErrorBox && (
        <ErrorFeedbackBox showSimpleMessage error={ errorMessage } className={ classNames.errorBox } />
      ) }

      { debug && (<pre>{ JSON.stringify(watch(), null, '  ') }</pre>) }
    </form>
  );
};

export const Form: React.FunctionComponent<FormProps> = (props) => {
  return (
    <RHMFForm
      { ...props }
      classNames={ { ...props.classNames, ...styles } }/>
  );
};
