import { ChangeEvent } from 'hoist-non-react-statics/node_modules/@types/react';
import React, { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useCombinedRefs } from '../../../hooks/combined-refs/combined-refs.hook';
import { BaseInputProps } from '../../inputs/base/base-input.types';
import { FormFieldFocusHandler } from '../form.component';

export interface FormNativeInputProps {
  type: React.JSXElementConstructor<any>;
  parentProps: BaseInputProps;
  disabled?: boolean;
  // error?: FieldError;
  onBlur?: FormFieldFocusHandler;
  onChange?: (name: string) => void;
  register: UseFormReturn['register'];
  // control: UseFormReturn['control'];
}

export const FormNativeInput: React.FunctionComponent<FormNativeInputProps> = ({
  type,
  parentProps,
  disabled,
  // error,
  onBlur: parentOnBlur,
  onChange: parentOnChange,
  register,
  // control,
}) => {
  const { name = '' } = parentProps;

  // TODO: Skip if no name or skip prop?
  const { ref, onBlur, onChange } = register<any>(name);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (parentOnBlur) parentOnBlur(e);

    onBlur(e);
  }, [parentOnBlur, onBlur]);

  const handleChange = useCallback((e: ChangeEvent) => {
    if (parentOnChange) parentOnChange(name);

    onChange(e);
  }, [parentOnChange, onChange, name]);

  const combinedRef = useCombinedRefs<HTMLInputElement>(ref, parentProps.ref);

  if (!name) return null;

  console.log(`Rendering ${ name }`);

  return React.createElement(type, to<BaseInputProps>({
    ...parentProps,

    // TODO: Merge parentProps and react-hook-form's:
    name,

    // key,
    disabled,
    // error: error?.message,

    onBlur: handleBlur,
    onChange: handleChange,
    ref: combinedRef,
  }));
};
