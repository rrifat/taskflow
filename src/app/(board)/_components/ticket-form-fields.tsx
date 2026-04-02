import FormFieldError from "@/components/ui/form-field-error";
import { TextInput } from "@/components/ui/text-input";

type TicketFormValues = {
  title: string;
  description: string;
  expiryDate: string;
};

type TicketFormFieldsProps = {
  values: TicketFormValues;
  errors: Record<string, string[] | undefined> | undefined;
  onChange: (next: Partial<TicketFormValues>) => void;
};

export function TicketFormFields({
  values,
  errors,
  onChange,
}: TicketFormFieldsProps) {
  const { title, description, expiryDate } = values;

  return (
    <>
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Title</span>
        <TextInput
          name="title"
          placeholder="Write a short ticket title"
          value={title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <FormFieldError errors={errors} fieldName="title" />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Description</span>
        <textarea
          className="min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500"
          name="description"
          placeholder="Add a concise description"
          value={description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        <FormFieldError errors={errors} fieldName="description" />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-800">Expiry date</span>
        <TextInput
          type="date"
          name="expiryDate"
          value={expiryDate}
          onChange={(event) => onChange({ expiryDate: event.target.value })}
        />
        <FormFieldError errors={errors} fieldName="expiryDate" />
      </label>
    </>
  );
}

export type { TicketFormValues };
