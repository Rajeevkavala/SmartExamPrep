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

const MAX_QUESTION_IMAGE_URLS = 6;

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
    .max(
      MAX_QUESTION_IMAGE_URLS,
      `Maximum ${MAX_QUESTION_IMAGE_URLS} question images are allowed.`
    )
    .default([])
    .transform((urls) => Array.from(new Set(urls))),
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

const experienceLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);

export const subjectConfidenceSchema = z.object({
  subject_id: z.string().uuid("Subject is required."),
  confidence_pct: z
    .number()
    .int("Confidence must be a whole number.")
    .min(0, "Confidence must be at least 0.")
    .max(100, "Confidence cannot exceed 100."),
});

export const onboardingProfileSchema = z.object({
  exam_target_date: z
    .string()
    .min(1, "Exam target date is required.")
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsed > today;
    }, "Exam target date must be in the future."),
  daily_study_minutes: z
    .number()
    .int("Daily study minutes must be a whole number.")
    .min(30, "Daily study minutes must be at least 30.")
    .max(180, "Daily study minutes cannot exceed 180."),
  experience_level: experienceLevelSchema,
  subject_confidences: z
    .array(subjectConfidenceSchema)
    .min(1, "Add confidence for at least one subject."),
  known_topic_ids: z.array(z.string().uuid("Selected topics are invalid.")).default([]),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type SubjectConfidenceInput = z.infer<typeof subjectConfidenceSchema>;
export type OnboardingProfileInput = z.infer<typeof onboardingProfileSchema>;
