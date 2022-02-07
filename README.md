# Minecraft Peridynamics

A Minecraft-like project exploring world generation using WebGL.

## How to Run

Go into minecraft folder and type "http-server dist -c-1" or ".\win_server.PS1"

## Controls

### Movment:

```
"KeyW": Move player foward case
"KeyA": Move player left case
"KeyS": Move player back case
"KeyD": Move player right case
"Space": Jump player up 1 block case
"ControlLeft": Crouch player down 1 block case
"ShiftLeft": Sprint increase the players speed by 2x case ​
"ArrowUp": Jump player up 1 block case
"ArrowDown": Crouch player down 1 block
"KeyC": Switch between survival and creative. Changes camera and removes gravity
"KeyP": Switches into pointer lock mode. Click the page and it will lock you in so it feels like a real game.
```

## File Hierarchy

#### Minecraft (Perlin Noise):

        App.ts - Inits the project

        Shaders - Handles the sahders in the program

        World:
            Block - Info about each block

            Chunk - Info about Chunks

            World - Info about World

            Procedural Generation (Perlin Noise) - Info about Perlin Noise

            Block Creation/Destruction - Info about blocks

            Player and Camera Movement - Info about Player Camera and movement

## Artifacts

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A1.png" alt="lock" width="250"/>
A1: The first thing was were able to generate with our modified code from a previous project.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A2.png" alt="lock" width="250"/> 
A2: Our first steps in loading texture maps.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A3.png" alt="lock" width="250"/>
A3: Our first attempts at making noise using a basic algorithm. This was not optimized and had man bugs.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A4.png" alt="lock" width="250"/>
A4: Our first attempt at Chunk generation. Was not correct due to our coordinates being off, along with a few other issues.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A5.png" alt="lock" width="250"/>
A5: Progress being made to our chunk generation as the chunks would follow the player although only in +z direction and with empty chunks in between.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A6.png" alt="lock" width="250"/>
A6: When we got chunk generation to work, however ineffectively. Our first attempt at trees. When survival mode player controls were corrected.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A7.png" alt="lock" width="250"/>
A7: Working trees along with a nice noise algorithm.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A8.png" alt="lock" width="250"/>
A8: Player gravity implemented as well as a buggy day/night cycle that would reset from back to light blue rather than the gradient. A9: Fixed day-night cycle, made chunk loading smoother, made project look nice, fixed controls, etc.

<img src="https://github.com/Albisourous/minecraftworldgeneration/blob/main/artifacts/A9.png" alt="lock" width="250"/>

## Extra Credit

Both members of this project (Albin and Govind) completed the ECIS for this class.

## Contributing

Please contact me on LinkedIn to collaborate: https://www.linkedin.com/in/albin-shrestha
