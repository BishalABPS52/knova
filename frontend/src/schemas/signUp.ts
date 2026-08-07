import { z } from "zod";

export const SignUpSchema = z
  .object({
    name: z
      .string()
      .min(3, { message: "Name must be at least 3 characters" })
      .max(30, { message: "Name must be at most 30 characters" }),

    username: z
      .string()
      .min(5, { message: "Username must be at least 5 characters" })
      .max(30, { message: "Username must be at most 30 characters" }),

    email: z.string().email({ message: "Please enter a valid email address" }),

    dateOfBirth: z
      .string()
      .min(1, { message: "Please enter your date of birth" }),

    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(30, { message: "Password must be at most 30 characters" }),

    confirmPassword: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(30, { message: "Password must be at most 30 characters" }),

    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, {
        message: "You must agree to the terms and conditions",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });