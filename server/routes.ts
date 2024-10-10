import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Friending, MoodMapping, Posting, Sessioning, Texting, VideoCalling } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  @Router.post("/moods")
  async setMood(session: SessionDoc, mood: string, recipient: string) {
    const user = Sessioning.getUser(session);
    const recipientUser = await Authing.getUserByUsername(recipient);

    if (!recipientUser) {
      throw new Error(`User with username ${recipient} not found.`);
    }

    const userName = (await Authing.getUserById(user)).username;
    const recipientName = recipientUser.username;

    await Friending.assertAreFriends(user, recipientUser._id, userName, recipientName);
    return await MoodMapping.setMood(user, recipientUser._id, mood);
  }

  @Router.get("/moods/:recipient")
  async getMood(session: SessionDoc, recipient: string) {
    const user = Sessioning.getUser(session);
    const recipientUser = await Authing.getUserByUsername(recipient);

    if (!recipientUser) {
      throw new Error(`User with username ${recipient} not found.`);
    }

    const userName = (await Authing.getUserById(user)).username;
    const recipientName = recipientUser.username;

    await Friending.assertAreFriends(user, recipientUser._id, userName, recipientName);

    const moods = await MoodMapping.getBothMoods(user, recipientUser._id);
    return `You: ${moods.yourMood || ""}    ${recipientName}: ${moods.recipientMood || ""}`;
  }

  @Router.delete("/moods")
  async removeMood(session: SessionDoc, recipient: string) {
    const user = Sessioning.getUser(session);
    const recipientUser = await Authing.getUserByUsername(recipient);

    if (!recipientUser) {
      throw new Error(`User with username ${recipient} not found.`);
    }

    const userName = (await Authing.getUserById(user)).username;
    const recipientName = recipientUser.username;

    await Friending.assertAreFriends(user, recipientUser._id, userName, recipientName);
    return await MoodMapping.removeMood(user, recipientUser._id);
  }

  @Router.post("/calls")
  async startCall(session: SessionDoc, recipient: string) {
    const callerId = Sessioning.getUser(session);

    const callerUser = await Authing.getUserById(callerId);
    const recipientUser = await Authing.getUserByUsername(recipient);

    if (!recipientUser) {
      throw new Error(`Recipient with username ${recipient} not found.`);
    }

    await Friending.assertAreFriends(callerId, recipientUser._id, callerUser.username, recipientUser.username);

    return await VideoCalling.startCall(callerId, recipientUser._id);
  }

  @Router.put("/calls/end")
  async endCall(session: SessionDoc, recipient: string) {
    const userId = Sessioning.getUser(session);

    const call = await VideoCalling.getCallStatusForUser(userId);

    if (!call) {
      throw new Error("You are not currently in any call to end.");
    }

    return await VideoCalling.endCall(call._id);
  }

  @Router.get("/calls/status")
  async getCallStatus(session: SessionDoc) {
    const userId = Sessioning.getUser(session);
    const call = await VideoCalling.getCallStatusForUser(userId);

    if (!call) {
      const pendingCall = await VideoCalling.getPendingCall(userId);
      if (pendingCall) {
        const callerUser = await Authing.getUserById(pendingCall.caller);
        return {
          msg: `${callerUser.username} is calling you.`,
          status: "pending",
          caller: callerUser.username,
        };
      }

      return { msg: "You are not in a call and no one is calling you." };
    }

    const isCaller = call.caller.equals(userId);
    const otherUserId = isCaller ? call.recipient : call.caller;
    const otherUser = await Authing.getUserById(otherUserId);

    if (call.status === "pending") {
      if (isCaller) {
        return {
          msg: `You are ringing ${otherUser.username}.`,
          status: "pending",
          recipient: otherUser.username,
        };
      } else {
        return {
          msg: `${otherUser.username} is calling you.`,
          status: "pending",
          caller: otherUser.username,
        };
      }
    }

    return {
      msg: `You are in an active call with ${otherUser.username}.`,
      status: "active",
      otherUser: otherUser.username,
    };
  }

  // @Router.put("/calls/reject")
  // async rejectCall(session: SessionDoc) {
  //   const recipientId = Sessioning.getUser(session);
  //   return await VideoCalling.rejectPendingCall(recipientId);
  // }

  @Router.put("/calls/accept")
  async acceptCall(session: SessionDoc) {
    const recipientId = Sessioning.getUser(session);
    return await VideoCalling.acceptPendingCall(recipientId);
  }

  @Router.get("/messages/:recipient")
  async getMessagesBetweenUsers(session: SessionDoc, recipient: string) {
    const user = Sessioning.getUser(session);
    const recipientUser = await Authing.getUserByUsername(recipient);

    if (!recipientUser) {
      throw new Error(`User with username ${recipient} not found.`);
    }

    const userName = (await Authing.getUserById(user)).username;
    const recipientName = recipientUser.username;

    await Friending.assertAreFriends(user, recipientUser._id, userName, recipientName);
    const messages = await Texting.getMessagesBetweenUsers(user, recipientUser._id);

    return await Responses.messages(messages);
  }

  @Router.post("/messages/:recipient")
  async sendMessage(session: SessionDoc, recipient: string, content: string) {
    const sender = Sessioning.getUser(session);
    const recipientUser = await Authing.getUserByUsername(recipient);

    if (!recipientUser) {
      throw new Error(`User with username ${recipient} not found.`);
    }

    const userName = (await Authing.getUserById(sender)).username;
    const recipientName = recipientUser.username;

    await Friending.assertAreFriends(sender, recipientUser._id, userName, recipientName);
    const result = await Texting.sendMessage(sender, recipientUser._id, content);

    const { message } = result;
    return await Responses.message(message);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
