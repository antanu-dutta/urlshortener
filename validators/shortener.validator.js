import z from "zod";

export const shortenerSchema = z.object({
  url: z
    .string({ message: "URL is required." })
    .trim()
    .url({ message: "Please enter a valid url" })
    .max(1024, { message: "Url can't be longer that 1024" }),

  shortCode: z
    .string({ message: "Short code is required" })
    .trim()
    .min(3, { message: "Short code must be greater than 3 characters" })
    .max(10, { message: "Short code can't be greater than 10 characters" }),
});
