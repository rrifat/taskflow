export default function FormFieldError({
  errors,
  fieldName,
}: {
  errors: Record<string, string[] | undefined> | undefined;
  fieldName: string;
}) {
  return errors?.[fieldName]?.[0] ? (
    <p className="text-sm text-rose-600">{errors[fieldName][0]}</p>
  ) : null;
}
