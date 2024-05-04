"chore.created";
"chore.updated";
"chore.archived";
"assignment.created";
"assignment.updated.completed";
"assignment.updated.uncompleted";
"assignment.updated.assigned";
"assignment.updated.reassigned";

type Model = "chore" | "assignment";
type EventDetail = string;
export type RangerEvent = `${Model}.${
  | "created"
  | "updated"
  | "archived"}${EventDetail extends never ? "" : `.${EventDetail}`}`;
// export const rangerEvent =

type ChoreCreated = {
  data: {
    id: string;
    houseId: string;
  };
};

type ChoreDeleted = {
  data: {
    id: string;
    houseId: string;
  };
};

type AssignHouseChoresForWeek = {
  data: {
    houseId: string;
  };
};

type UserNeedsAssignments = {
  data: {
    id: string;
  };
};

type SendPendingTasksNotification = {
  data: {
    userId: string;
  };
};

type SendChoresDueNotification = {
  data: {
    userId: string;
    choreNames: string[];
  };
};

type AssignmentsReassigned = {
  data: {
    assignmentIds: string[];
    fromUserId: string;
    toUserId: string;
  };
};

type HouseDeleted = {
  data: {
    id: string;
    memberIds: string[];
  };
};

export type RangerEvents = {
  "chore.created": ChoreCreated;
  "chore.deleted": ChoreDeleted;
  "house.deleted": HouseDeleted;
  "assignments.reassigned": AssignmentsReassigned;
  "notifications.house.chores-due": {
    data: {
      houseId: string;
    };
  };
  "command.house.assign-for-week": {
    data: { houseId: string };
  };

  // [RangerEvent.ASSIGN_HOUSE_CHORES_FOR_THE_WEEK]: AssignHouseChoresForWeek;
  // [RangerEvent.USER_JOINED_HOUSE]: UserNeedsAssignments;
  // [RangerEvent.SEND_PENDING_TASKS_NOTIFICATION]: SendPendingTasksNotification;
  // [RangerEvent.MANUALLY_NOTIFY_OF_PENDING_TASKS]: {
  //   // biome-ignore lint/complexity/noBannedTypes: trying to express empty
  //   data: {};
  // };
  // [RangerEvent.SEND_CHORES_DUE_NOTIFICATION]: SendChoresDueNotification;
  // [RangerEvent.ASSIGNMENTS_MOVED]: AssignmentsMoved;
  // // biome-ignore lint/complexity/noBannedTypes: trying to express empty
  // [RangerEvent.MANUALLY_NOTIFY_OF_TODAY_TASKS]: { data: {} };
};
