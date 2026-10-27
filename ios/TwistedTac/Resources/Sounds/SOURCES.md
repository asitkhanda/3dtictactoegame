# Sound sources

Recordings from Epidemic Sound, converted to 44.1 kHz mono 16-bit WAV and
peak-normalized per cue (tap and turn cues quiet, win and loss louder).
`ArcadeSound.recordingName` maps each cue to its file; the synthesized recipes
in `ArcadeSound.layers` are the fallback, and the draw cue still uses one.

Check that the Epidemic Sound plan used for these covers embedding sounds in a
distributed app before shipping. If not, delete the WAVs and the app falls back
to the synthesized cues.

| File | Cue | Epidemic Sound title | ID |
|---|---|---|---|
| tap.wav | selection tap | User Interface, Click, UI Buttons, Glassy, Touch | 45c94b43-2fb0-4970-98db-cc0fe6ea3678 |
| placeX.wav | place X | Games, Board, Draughts, Game Piece, Place Down Onto Board Square | 252e5802-4529-42a1-abf1-21ddb7e132b5 |
| placeO.wav | place O | Draughts, Game Piece, Place Down Onto Board Square 03 | 25c5560d-d2da-4803-ba30-47f8851d70a4 |
| yourTurn.wav | your turn | User Interface, Alert, Notification, Email, Receive, Incoming 03 | cedf7ae5-0b6a-4142-a20f-9db29aad8423 |
| opponentTurn.wav | opponent's turn | User Interface, Alert, Notification, Message, Text 05 | d574019e-3f55-4784-b092-36ebb3fb4221 |
| layerWin.wav | layer claimed | User Interface, Alert, Notification, Video Game, Positive, Musical, Coin Collected, Item Achieved, Achievement 05 | 001d53a9-a888-41ba-86d2-73b7e4b63a1d |
| layerLost.wav | layer lost | User Interface, Alert, Notification, Message Recieved, Negative, Calm, Glass, Short | e85bba19-dc00-491b-b03a-980a8f26365e |
| victory.wav | you win | Magic, Shimmer, Shing, Ringing Chime | bf81899c-45a9-4b6f-a006-11c32d2040fd |
| defeat.wav | you lose | User Interface, Alert, Game Over, Defeat, Loss, Negative, Notification 01 | 075601f7-c7d9-46e5-a132-fb1e2691920f |
| invalid.wav | illegal move | User Interface, Alert, Error Tone, Buzz | 436aeb79-2820-48eb-a1f4-b77fcd7456b1 |
