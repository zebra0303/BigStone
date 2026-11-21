import { createToastStore } from "@zebra/core/client";

// Shared toast store powered by @zebra/core to avoid timer leaks and duplicated UI
export const useToast = createToastStore({ duration: 2500 });
