import { type StandardSchemaV1 } from "@standard-schema/spec";

export interface Tool<
  Args extends undefined | StandardSchemaV1 = undefined | StandardSchemaV1,
  T = any
> {
  name: string;
  description: string;
  args?: Args;
  run: Args extends StandardSchemaV1
    ? (args: StandardSchemaV1.InferOutput<Args>) => Promise<T>
    : () => Promise<T>;
}

export const tool = <
  Args extends undefined | StandardSchemaV1 = undefined | StandardSchemaV1,
  T = any
>(
  input: Tool<Args, T>
) => {
  return input;
};
