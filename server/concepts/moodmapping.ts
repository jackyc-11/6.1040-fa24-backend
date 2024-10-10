import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotFoundError } from "./errors";

// Defining the Mood document interface
export interface MoodDoc extends BaseDoc {
  user: ObjectId;
  friend: ObjectId;
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
  async setMood(user: ObjectId, friend: ObjectId, mood: string) {
    if (!mood || !/^\p{Emoji}$/u.test(mood)) {
      throw new BadValuesError("Mood must be a valid emoji!");
    }

    const existingMood = await this.moods.readOne({ user });

    if (existingMood) {
      await this.moods.partialUpdateOne({ user, friend }, { mood });
      return { msg: "Mood updated successfully!", mood: await this.moods.readOne({ user, friend }) };
    } else {
      const _id = await this.moods.createOne({ user, friend, mood });
      return { msg: "Mood set successfully!", mood: await this.moods.readOne({ _id }) };
    }
  }

  // Fetch both user's and friend's mood
  async getBothMoods(user: ObjectId, friend: ObjectId) {
    const yourMoodDoc = await this.moods.readOne({ user, friend });
    const friendMoodDoc = await this.moods.readOne({ user: friend, friend: user });

    return {
      yourMood: yourMoodDoc ? yourMoodDoc.mood : null,
      friendMood: friendMoodDoc ? friendMoodDoc.mood : null,
    };
  }

  // Remove the user's mood
  async removeMood(user: ObjectId, friend: ObjectId) {
    const deletedMood = await this.moods.deleteOne({ user, friend });
    console.log("HELLO WORLD");
    console.log("MOOD:" + deletedMood);
    if (deletedMood.deletedCount === 0) {
      throw new NotFoundError("No mood was set for this user.");
    }
    return { msg: "Mood removed successfully!" };
  }
}
