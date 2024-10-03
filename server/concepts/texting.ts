import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotFoundError } from "./errors";

export interface MessageDoc extends BaseDoc {
  sender: ObjectId;
  recipient: ObjectId;
  content: string;
  timestamp: Date;
}

/**
 * concept: Texting [User]
 */
export default class TextingConcept {
  public readonly messages: DocCollection<MessageDoc>;

  constructor(collectionName: string) {
    this.messages = new DocCollection<MessageDoc>(collectionName);
  }

  // Sends a message from one user to another
  async sendMessage(sender: ObjectId, recipient: ObjectId, content: string) {
    // Ensure content is not empty
    if (!content) {
      throw new BadValuesError("Message content cannot be empty");
    }

    // Create a new message document
    const timestamp = new Date();
    const _id = await this.messages.createOne({ sender, recipient, content, timestamp });
    
    return { msg: "Message sent successfully!", message: await this.messages.readOne({ _id }) };
  }

  // Retrieves a specific message by its ObjectId
  async getMessageById(_id: ObjectId) {
    const message = await this.messages.readOne({ _id });
    if (!message) {
      throw new NotFoundError("Message not found");
    }
    return message;
  }

  // Retrieves all messages between two users, sorted by timestamp
  async getMessagesBetweenUsers(user1: ObjectId, user2: ObjectId) {
    const messages = await this.messages.readMany({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ]
    }, { sort: { timestamp: 1 } });
    
    return messages;
  }

  // Retrieve all messages sent to a user
  async getMessagesForUser(userId: ObjectId) {
    const messages = await this.messages.readMany({ recipient: userId }, { sort: { timestamp: -1 } });
    return messages;
  }

  // Deletes a message by its ID
  async deleteMessage(_id: ObjectId) {
    await this.messages.deleteOne({ _id });
    return { msg: "Message deleted successfully!" };
  }
}
