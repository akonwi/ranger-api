import { shuffle } from "lodash";
import { Chore } from "../../chores/chore.model";
import { Maybe, isEmpty, isNil, toRecord } from "../../utils";
import { AssignmentService } from "../assignment.service";

class Node<T> {
  private _next: Maybe<Node<T>> = null;

  constructor(public readonly value: T) {}

  set next(node: Maybe<Node<T>>) {
    this._next = node;
  }

  get next(): Maybe<Node<T>> {
    return this._next;
  }
}

class LinkedList<T> {
  private _head: Maybe<Node<T>> = null;
  private _tail: Maybe<Node<T>> = null;

  append(value: T): this {
    const node = new Node(value);

    if (!this._head) {
      this._head = node;
      this._tail = node;
    } else {
      if (this._tail === null) throw new Error("tail is null");
      this._tail.next = node;
      this._tail = node;
    }

    return this;
  }

  get circularIterator() {
    return {
      [Symbol.iterator]: () => {
        let current = this._head;
        if (current === null)
          throw new Error("Cannot iterate over an empty list");

        return {
          next() {
            const value = current!.value;
            current = current!.next === null ? this._head : current!.next;
            return { done: false, value };
          },
        };
      },
    }[Symbol.iterator]();
  }

  static fromArray<T>(values: T[]): LinkedList<T> {
    const list = new LinkedList<T>();
    if (isEmpty(values)) return list;
    if (values.length === 1) {
      return list.append(values[0]);
    }

    values.forEach(value => list.append(value));
    return list;
  }
}

export type StrategyOptions = {
  houseId: string;
  members: string[];
  chores: Chore[];
};

export type StrategyResult = {
  [userId: string]: Array<{
    week: number;
    choreId: string;
    userId: string;
    houseId: string;
    isPenalty: boolean;
  }>;
};

export class RoundRobinStrategy {
  constructor(
    private readonly _assignmentService: AssignmentService,
    private readonly _options: StrategyOptions,
  ) {}

  async apply(week: number): Promise<StrategyResult> {
    const { members, chores, houseId } = this._options;
    const usersToAssignments: StrategyResult = toRecord(members, _ => []);

    const memberList = LinkedList.fromArray(members);
    const memberIterator = memberList.circularIterator;

    for (const chore of chores) {
      let assignee = memberIterator.next().value;

      // if assignee did it last, go to the next person
      const lastAssignment = await this._assignmentService.findLatestForChore({
        choreId: chore.id,
        houseId,
      });
      while (lastAssignment && lastAssignment.userId === assignee) {
        assignee = memberIterator.next().value;
      }

      usersToAssignments[assignee].push({
        week,
        houseId,
        choreId: chore.id,
        userId: assignee,
        isPenalty: false,
      });
    }

    return usersToAssignments;

    // const currentAssignments = await assignmentService.findForWeek({
    //   houseId,
    //   week,
    //   isPenalty: false,
    //   chore: { designatedUserId: null },
    // });
    // const idsToCount = toRecord(members, _ => 0);
    // for (const chore of chores) {
    //   const lastAssignment = await this._assignmentService.findLatestForChore({
    //     choreId: chore.id,
    //     houseId,
    //   });

    //   let assignee = this._assignmentService.getNextAssignee({
    //     choreId: chore.id,
    //     skip: lastAssignment?.userId,
    //     idsToCount,
    //   });
    //   if (isNil(assignee)) assignee = shuffle(members)[0];

    //   usersToAssignments[assignee].push({
    //     week,
    //     houseId,
    //     choreId: chore.id,
    //     userId: assignee,
    //     isPenalty: false,
    //   });
    // }

    return usersToAssignments;
  }
}
