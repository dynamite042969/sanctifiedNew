import * as React from 'react';
import Button from '@mui/material/Button';

export type HelloProps = {
  label: string;
  onPress?: () => void;
};

export function Hello({ label, onPress }: HelloProps) {
  return (
    <Button variant="contained" onClick={onPress}>
      {label}
    </Button>
  );
}
