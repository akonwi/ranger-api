import { EventSchemas, Inngest } from "inngest";
import { RangerEvents } from "./events";

export const inngest = new Inngest({
  id: "ranger-api",
  schemas: new EventSchemas().fromRecord<RangerEvents>(),
});
