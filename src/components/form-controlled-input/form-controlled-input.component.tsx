import React, { useCallback } from 'react';
import { Controller, ControllerProps, UseFormReturn } from 'react-hook-form';
import { combineRefs } from '../../../hooks/combined-refs/combined-refs.hook';
import { BaseInputProps } from '../../inputs/base/base-input.types';
import { FormFieldFocusHandler } from '../form.component';

export interface FormControlledInputProps {
  type: React.JSXElementConstructor<any>;
  parentProps: BaseInputProps;
  disabled?: boolean;
  // error?: FieldError;
  onBlur?: FormFieldFocusHandler;
  onChange?: (name: string) => void;
  // register: UseFormReturn['register'];
  control: UseFormReturn['control'];
}

export const FormControlledInput: React.FunctionComponent<FormControlledInputProps> = ({
  type,
  parentProps,
  disabled,
  // error,
  onBlur: parentOnBlur,
  onChange: parentOnChange,
  // register,
  control,
}) => {
  const { name = '' } = parentProps;

  const controllerRender: ControllerProps<any>['render'] = useCallback(({
    field: { onChange, onBlur, value, /* value = 0,*/ name, ref },
    fieldState: { invalid, isTouched, isDirty, error },
    formState,
  }) => {
    const handleBlur = parentOnBlur ? (e: React.FocusEvent<HTMLInputElement>) => {
      parentOnBlur(e);
      onBlur();
    } : onBlur;

    const handleChange = parentOnChange ? (...event: any[]) => {
      parentOnChange(name);
      onChange(...event);
    } : onChange;

    const combinedRef = combineRefs<HTMLInputElement>(ref, parentProps.inputRef);

    return React.createElement(type, to<BaseInputProps>({
      ...parentProps,

      // TODO: Merge parentProps and react-hook-form's:
      onBlur: handleBlur,
      onChange: handleChange,
      value,
      name,

      disabled,
      error: error?.message,
      inputRef: combinedRef,
    }));
  }, [disabled, parentOnBlur, parentOnChange, parentProps, type]);

  if (!name) return null;

  return (
    <Controller
      // defaultValue={}
      control={ control }
      name={ name }
      render={ controllerRender } />
  );
};
