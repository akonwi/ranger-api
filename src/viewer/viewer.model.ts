import { ObjectType } from "@nestjs/graphql";
import { User } from "src/users/user.model";

@ObjectType()
export class Viewer extends User {}
