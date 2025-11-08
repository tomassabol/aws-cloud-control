/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as z from "zod"

export type Tool<
  Args extends undefined | z.ZodSchema = undefined | z.ZodSchema,
> = {
  name: string
  description: string
  args?: Args
  run: Args extends z.ZodSchema
    ? (args: z.infer<Args>) => Promise<any>
    : () => Promise<any>
}

export const tool = <Args extends undefined | z.ZodSchema>(input: Tool<Args>) =>
  input
