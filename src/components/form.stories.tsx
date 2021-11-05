import { withKnobs, number } from '@storybook/addon-knobs';
import React from 'react';
import { RHMFForm } from './form.component';

export default {
  title: 'ui/components/Form',
  component: RHMFForm,
  decorators: [withKnobs],
};

export const Default = () => {
  return (
    <RHMFForm debug>
      <div><input type="text" name="firstName" placeholder="First Name" /></div>
      <div><input type="text" name="lastName" placeholder="Last Name" /></div>
    </RHMFForm>
  );
};
