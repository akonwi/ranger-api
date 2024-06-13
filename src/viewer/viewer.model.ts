import { ObjectType } from "@nestjs/graphql";
import { User } from "../users/user.model";

@ObjectType()
export class Viewer extends User {}
