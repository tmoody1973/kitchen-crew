/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiUsage from "../aiUsage.js";
import type * as chats from "../chats.js";
import type * as demo from "../demo.js";
import type * as history from "../history.js";
import type * as household from "../household.js";
import type * as listItems from "../listItems.js";
import type * as model from "../model.js";
import type * as pantry from "../pantry.js";
import type * as plans from "../plans.js";
import type * as receipts from "../receipts.js";
import type * as recipes from "../recipes.js";
import type * as regulars from "../regulars.js";
import type * as weeks from "../weeks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiUsage: typeof aiUsage;
  chats: typeof chats;
  demo: typeof demo;
  history: typeof history;
  household: typeof household;
  listItems: typeof listItems;
  model: typeof model;
  pantry: typeof pantry;
  plans: typeof plans;
  receipts: typeof receipts;
  recipes: typeof recipes;
  regulars: typeof regulars;
  weeks: typeof weeks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
