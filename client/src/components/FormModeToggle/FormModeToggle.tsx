import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';

export type FormMode = 'individual' | 'pallet';

interface FormModeToggleProps {
  value: FormMode;
  onChange: (mode: FormMode) => void;
}

export default function FormModeToggle({ value, onChange }: FormModeToggleProps) {
  const handleChange = (event: SelectChangeEvent) => {
    onChange(event.target.value as FormMode);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 160, mb: 2 }}>
      <Select value={value} onChange={handleChange}>
        <MenuItem value="individual">Individual</MenuItem>
        <MenuItem value="pallet">Pallet</MenuItem>
      </Select>
    </FormControl>
  );
}
