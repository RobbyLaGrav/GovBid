export interface FormField {
  name: string;
  label: string;
  required: boolean;
  value?: string;
}

export interface FormTemplate {
  id: string;
  title: string;
  fields: FormField[];
}

export class FormFillerService {
  private templates: FormTemplate[] = [
    {
      id: "sf33",
      title: "SF33 Solicitation Form",
      fields: [
        { name: "vendor_name", label: "Vendor Name", required: true },
        { name: "duns", label: "DUNS/UEI", required: true },
        { name: "address", label: "Address", required: true },
        { name: "contact", label: "Point of Contact", required: true }
      ]
    }
  ];

  listTemplates(): FormTemplate[] {
    return this.templates.map((template) => ({ ...template, fields: template.fields.map((field) => ({ ...field })) }));
  }

  fillTemplate(id: string, values: Record<string, string>): FormTemplate | undefined {
    const template = this.templates.find((item) => item.id === id);
    if (!template) return undefined;
    return {
      ...template,
      fields: template.fields.map((field) => ({
        ...field,
        value: values[field.name] ?? field.value
      }))
    };
  }
}
