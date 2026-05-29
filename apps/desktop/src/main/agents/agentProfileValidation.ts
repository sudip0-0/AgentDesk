import { z } from "zod";
import {
  agentProfileModes,
  agentPromptDeliveries,
  agentWorkingDirectoryBehaviors
} from "../../shared/agentProfileTypes.js";

const agentProfileFields = {
  name: z.string().trim().min(1, "Profile name is required.").max(120),
  command: z.string().trim().min(1, "Profile command is required.").max(500),
  argsTemplate: z.string().max(4000),
  shell: z.enum(["powershell", "cmd"]),
  mode: z.enum(agentProfileModes),
  envText: z.string().max(4000),
  workingDirectoryBehavior: z.enum(agentWorkingDirectoryBehaviors),
  promptDelivery: z.enum(agentPromptDeliveries)
};

export const agentProfileInputSchema = z.object(agentProfileFields);

export const agentProfileUpdateSchema = agentProfileInputSchema.extend({
  id: z.string().uuid()
});

export const agentProfileDeleteSchema = z.object({
  id: z.string().uuid()
});

export const agentProfileTestSchema = z.object({
  id: z.string().uuid()
});

export const parseAgentProfilePayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid agent profile request."
    };
  }

  return { success: true, data: result.data };
};
