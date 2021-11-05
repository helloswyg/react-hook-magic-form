import React, { useCallback } from 'react';
import { FieldError, useFieldArray, UseFormReturn } from 'react-hook-form';
import { combineRefs } from '../../../hooks/combined-refs/combined-refs.hook';
import { BaseInputProps } from '../../inputs/base/base-input.types';
import { FormFieldFocusHandler } from '../form.component';

export interface FormArrayInputProps {
  type: React.JSXElementConstructor<any>;
  // parentProps: ArrayInputProps; // TODO: Improve this type.
  parentProps: BaseInputProps;
  disabled?: boolean;
  error?: FieldError;
  errors?: FieldError[];
  onBlur?: FormFieldFocusHandler;
  register: UseFormReturn['register'];
  control: UseFormReturn['control'];
}

export const FormArrayInput: React.FunctionComponent<FormArrayInputProps> = ({
  type,
  parentProps,
  disabled,
  error,
  errors = [],
  onBlur: parentOnBlur,
  register,
  control,
}) => {
  // TODO: parentProps could contain getItemProps as well:
  const { name = '' } = parentProps;

  const arrayFieldProps = useFieldArray<any>({
    name,
    control,
  });

  const getItemProps = useCallback((name) => {
    // TODO: Merge onChange too?

    const { onBlur, ref, ...rest } = register(name);
    const combinedRef = combineRefs<HTMLInputElement>(ref, parentProps.inputRef);

    return to<BaseInputProps>({
      ...rest,

      onBlur: parentOnBlur ? (e: React.FocusEvent<HTMLInputElement>) => {
        parentOnBlur(e);
        onBlur(e);
      } : onBlur,

      inputRef: combinedRef,
    });
  }, [parentOnBlur, parentProps.inputRef, register]);

  if (!name) return null;

  // return React.createElement(type, to<BaseInputProps>({
  return React.createElement(type, {
    ...parentProps,

    // TODO: Merge parentProps and react-hook-form's:
    ...arrayFieldProps,

    disabled,
    error: error?.message,
    errors,
    getItemProps,
  });
};
