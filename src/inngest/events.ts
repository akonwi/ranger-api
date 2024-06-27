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

type AssignmentsReassigned = {
  data: {
    assignmentIds: string[];
    fromUserId: string;
    toUserId: string;
    asPenalty: boolean;
  };
};

type HouseDeleted = {
  data: {
    id: string;
    memberIds: string[];
  };
};

type HouseMemberJoined = {
  data: {
    id: string;
    memberId: string;
  };
};

export type RangerEvents = {
  "chore.created": ChoreCreated;
  "chore.deleted": ChoreDeleted;
  "house.deleted": HouseDeleted;
  "house.updated.member-joined": HouseMemberJoined;
  "assignments.reassigned": AssignmentsReassigned;
  "notifications.house.chores-due": {
    data: {
      houseId: string;
      week: number;
    };
  };
  "command.house.assign-for-week": {
    data: { houseId: string };
  };
  "command.user.send-reminder": {
    data: { userId: string; week: number };
  };
};
