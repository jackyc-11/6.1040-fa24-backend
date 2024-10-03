import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotFoundError } from "./errors";

export interface CallDoc extends BaseDoc {
  caller: ObjectId;
  recipient: ObjectId;
  startTime: Date;
  endTime?: Date;
}

/**
 * concept: Video Calling [User, Call]
 */
export default class VideoCallingConcept {
  public readonly activeCalls: DocCollection<CallDoc>;

  constructor(collectionName: string) {
    this.activeCalls = new DocCollection<CallDoc>(collectionName);
  }

  // Start a video call between two users
  async startCall(caller: ObjectId, recipient: ObjectId) {
    if (caller.equals(recipient)) {
      throw new BadValuesError("Caller and recipient cannot be the same user.");
    }

    const startTime = new Date();
    const _id = await this.activeCalls.createOne({ caller, recipient, startTime });
    
    return { msg: "Call started successfully!", call: await this.activeCalls.readOne({ _id }) };
  }

  // End a video call
  async endCall(callId: ObjectId) {
    const call = await this.activeCalls.readOne({ _id: callId });
    if (!call) {
      throw new NotFoundError("Call not found.");
    }
    if (call.endTime) {
      throw new BadValuesError("Call has already ended.");
    }

    const endTime = new Date();
    await this.activeCalls.partialUpdateOne({ _id: callId }, { endTime });
    return { msg: "Call ended successfully!" };
  }

  // Get the current status of a call (ongoing or ended)
  async getCallStatus(callId: ObjectId) {
    const call = await this.activeCalls.readOne({ _id: callId });
    if (!call) {
      throw new NotFoundError("Call not found.");
    }
    return call;
  }
}
