import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface CallDoc extends BaseDoc {
  caller: ObjectId;
  recipient: ObjectId;
  status: "active" | "ended" | "pending";
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
  async startCall(caller: ObjectId, recipient: ObjectId, status: "pending" | "active" = "pending") {
    await this.assertUserNotInActiveCall(caller);
    await this.assertUserNotInActiveCall(recipient);

    const _id = await this.activeCalls.createOne({ caller, recipient, status });

    return { msg: "Call started successfully!", call: await this.activeCalls.readOne({ _id }) };
  }

  // Accept a pending video call for the recipient
  async acceptPendingCall(recipientId: ObjectId) {
    const pendingCall = await this.activeCalls.readOne({
      recipient: recipientId,
      status: "pending",
    });

    if (!pendingCall) {
      throw new NotFoundError("No pending call found for this user.");
    }

    await this.activeCalls.partialUpdateOne({ _id: pendingCall._id }, { status: "active" });

    return { msg: "Call accepted, now active!", call: await this.activeCalls.readOne({ _id: pendingCall._id }) };
  }

  // // Reject a pending video call for the recipient
  // async rejectPendingCall(recipientId: ObjectId) {
  //   const pendingCall = await this.activeCalls.readOne({
  //     recipient: recipientId,
  //     status: "pending",
  //   });

  //   if (!pendingCall) {
  //     throw new NotFoundError("No pending call found for this user.");
  //   }

  //   await this.activeCalls.deleteOne({ _id: pendingCall._id });

  //   return { msg: "Call rejected and deleted." };
  // }

  // Get the pending call for a recipient
  async getPendingCall(recipientId: ObjectId) {
    return await this.activeCalls.readOne({
      recipient: recipientId,
      status: "pending",
    });
  }

  // End a video call
  async endCall(callId: ObjectId) {
    const call = await this.activeCalls.readOne({ _id: callId });
    if (!call) {
      throw new NotFoundError("Call not found.");
    }
    if (call.status === "ended") {
      throw new NotAllowedError("Call has already ended.");
    }

    await this.activeCalls.partialUpdateOne({ _id: callId }, { status: "ended" });
    return { msg: "Call ended successfully!" };
  }

  // Get the call status for a user (either caller or recipient)
  async getCallStatusForUser(userId: ObjectId) {
    return await this.activeCalls.readOne({
      $or: [
        { caller: userId, status: { $in: ["active", "pending"] } },
        { recipient: userId, status: { $in: ["active", "pending"] } },
      ],
    });
  }

  // Find the active call between two users
  async getActiveCallBetweenUsers(user1: ObjectId, user2: ObjectId) {
    return await this.activeCalls.readOne({
      $or: [
        { caller: user1, recipient: user2, status: "active" },
        { caller: user2, recipient: user1, status: "active" },
      ],
    });
  }

  // Check if a user is already in an active call
  private async assertUserNotInActiveCall(user: ObjectId) {
    const activeCall = await this.activeCalls.readOne({
      $or: [{ caller: user }, { recipient: user }],
      status: { $in: ["active", "pending"] },
    });

    if (activeCall) {
      throw new NotAllowedError(`User with ID ${user} is already in a call.`);
    }
  }
}
