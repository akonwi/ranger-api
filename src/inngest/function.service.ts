import { Injectable } from "@nestjs/common";
import { InngestFunction } from "inngest";

@Injectable()
export class FunctionService {
  getFunctions(): InngestFunction[] {
    return [];
  }
}
