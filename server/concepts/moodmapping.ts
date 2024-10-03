import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { BadValuesError, NotFoundError } from "./errors";

// Defining the Mood document interface
export interface MoodDoc extends BaseDoc {
  user: ObjectId;
  mood: string; // emoji string?
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
  async setMood(user: ObjectId, mood: string) {
    if (!mood) {
      throw new BadValuesError("Mood cannot be empty!");
    }

    // Check if the user already has a mood set
    const existingMood = await this.moods.readOne({ user });

    if (existingMood) {
      // Update the mood if already exists
      await this.moods.partialUpdateOne({ user }, { mood });
      return { msg: "Mood updated successfully!", mood: await this.moods.readOne({ user }) };
    } else {
      // Otherwise, create a new mood document
      const _id = await this.moods.createOne({ user, mood });
      return { msg: "Mood set successfully!", mood: await this.moods.readOne({ _id }) };
    }
  }

  // Get the mood of a specific user
  async getMood(user: ObjectId) {
    const mood = await this.moods.readOne({ user });
    if (!mood) {
      throw new NotFoundError("Mood not found for this user.");
    }
    return mood;
  }

  // Remove the user's mood
  async removeMood(user: ObjectId) {
    const deletedMood = await this.moods.deleteOne({ user });
    if (!deletedMood) {
      throw new NotFoundError("No mood was set for this user.");
    }
    return { msg: "Mood removed successfully!" };
  }
}
