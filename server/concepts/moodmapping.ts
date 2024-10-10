import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotFoundError } from "./errors";

// Defining the Mood document interface
export interface MoodDoc extends BaseDoc {
  user: ObjectId;
  recipient: ObjectId;
  mood: string;
}

/**
 * concept: Mood Mapping [User, Message]
 */
export default class MoodMappingConcept {
  public readonly moods: DocCollection<MoodDoc>;

  constructor(collectionName: string) {
    this.moods = new DocCollection<MoodDoc>(collectionName);
  }

  // Set the user's mood
  async setMood(user: ObjectId, recipient: ObjectId, mood: string) {
    if (!mood || !/^\p{Emoji}$/u.test(mood)) {
      throw new BadValuesError("Mood must be a valid emoji!");
    }

    const existingMood = await this.moods.readOne({ user });

    if (existingMood) {
      await this.moods.partialUpdateOne({ user, recipient }, { mood });
      return { msg: "Mood updated successfully!", mood: await this.moods.readOne({ user, recipient }) };
    } else {
      const _id = await this.moods.createOne({ user, recipient, mood });
      return { msg: "Mood set successfully!", mood: await this.moods.readOne({ _id }) };
    }
  }

  // Fetch both user's and recipient's mood
  async getBothMoods(user: ObjectId, recipient: ObjectId) {
    const yourMoodDoc = await this.moods.readOne({ user, recipient });
    const recipientMoodDoc = await this.moods.readOne({ user: recipient, recipient: user });

    return {
      yourMood: yourMoodDoc ? yourMoodDoc.mood : null,
      recipientMood: recipientMoodDoc ? recipientMoodDoc.mood : null,
    };
  }

  // Remove the user's mood
  async removeMood(user: ObjectId, recipient: ObjectId) {
    const deletedMood = await this.moods.deleteOne({ user, recipient });
    console.log("HELLO WORLD");
    console.log("MOOD:" + deletedMood);
    if (deletedMood.deletedCount === 0) {
      throw new NotFoundError("No mood was set for this user.");
    }
    return { msg: "Mood removed successfully!" };
  }
}
