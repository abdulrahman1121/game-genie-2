Math Pair Game

Overview

Math Pair Game is an engaging, web-based puzzle game designed to enhance mathematical skills through interactive gameplay. Players match pairs of numbers on a 4x4 grid that satisfy a given mathematical operation (addition, subtraction, multiplication, or division) to reach a target value. With a sleek, modern interface built using React and Tailwind CSS, and a robust backend powered by Node.js and Express, the game offers a fun and educational experience for users of all skill levels.

Features





Three Difficulty Levels: Choose from Basic (addition, subtraction), Intermediate (adds multiplication), or Advanced (adds division) to suit different skill levels.



Dynamic Gameplay: A 4x4 grid of numbers is generated, where each pair matches a target value based on the selected operation.



Modern UI: Features a responsive design with a customizable background image, a meshed grid with 2px gaps, and a vibrant header with a green background and pink text in the Monda font.



Real-Time Feedback: Visual cues (green for correct, red for incorrect) and a win condition when all pairs are matched.



Error Handling: Robust safeguards prevent crashes from invalid data, ensuring a smooth user experience.



Backend Integration: Powered by an Express server with OpenAI integration for generating valid number pairs, with a fallback for local generation if needed.

Tech Stack





Frontend: React 19.1.0, Tailwind CSS 3.4.13, Vite 7.0.4, Axios



Backend: Node.js, Express, OpenAI API



Styling: Custom Tailwind utilities, Monda font, transparent component backgrounds for a custom background image



Environment: Requires an OpenAI API key stored in a .env file
