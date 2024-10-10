import AuthenticatingConcept from "./concepts/authenticating";
import FriendingConcept from "./concepts/friending";
import MoodMappingConcept from "./concepts/moodmapping";
import PostingConcept from "./concepts/posting";
import SessioningConcept from "./concepts/sessioning";
import TextingConcept from "./concepts/texting";
import VideoCallingConcept from "./concepts/videocalling";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Posting = new PostingConcept("posts");
export const Friending = new FriendingConcept("friends");
export const Texting = new TextingConcept("messages");
export const MoodMapping = new MoodMappingConcept("moods");
export const VideoCalling = new VideoCallingConcept("videocalls");
