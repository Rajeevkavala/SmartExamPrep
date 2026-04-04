import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalUrl = z
  .union([z.string().trim().url("Enter a valid URL."), z.literal("")])
  .optional()
  .transform((value) => (value ? value : undefined));

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d).+$/,
      "Password must include at least one letter and one number."
    ),
});

export const questionSchema = z.object({
  subject_id: z.string().uuid("Subject is required."),
  topic_id: z.string().uuid("Topic is required."),
  subtopic: optionalTrimmedString,
  question_text: z
    .string()
    .trim()
    .min(10, "Question text must be at least 10 characters."),
  options: z
    .array(z.string().trim().min(1, "Option text is required."))
    .length(4, "Exactly 4 options (A-D) are required."),
  question_image_urls: z
    .array(z.string().trim().url("Enter valid image URLs."))
    .default([]),
  correct_answer: z.enum(["A", "B", "C", "D"]),
  explanation: optionalTrimmedString,
  difficulty: z.enum(["easy", "medium", "hard"]),
  source_type: z.enum(["PYQ", "practice", "scraped"]),
  source_url: optionalUrl,
  year: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return Number(value);
    },
    z
      .number()
      .int("Year must be a whole number.")
      .min(1991, "Year must be 1991 or later.")
      .max(2100, "Year must be 2100 or earlier.")
      .optional()
  ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;