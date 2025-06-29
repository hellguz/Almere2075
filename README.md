# Almere 2075 App

This application generates futuristic, sustainable architectural concepts for locations in Almere based on user-uploaded images.

## Architecture

- [cite_start]**Frontend:** React (Vite + JS) [cite: 4]
- [cite_start]**Backend:** FastAPI (Python) [cite: 4]
- [cite_start]**Proxy:** Nginx [cite: 4]
- [cite_start]**Containerization:** Docker & Docker Compose [cite: 4]

## How to Run

1.  **Prerequisites:**
    * Docker
    * Docker Compose

2.  **API Keys:**
    * Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    * [cite_start]Open the new `.env` file and fill in your `OPENAI_API_KEY` and `REPLICATE_API_KEY`. [cite: 5] The `.env` file is listed in `.gitignore` and will not be pushed to GitHub.

3.  **Example Images:**
    * [cite_start]Place your example JPEG or PNG images inside the `./backend/images/` directory. [cite: 6]
    * The application will automatically generate thumbnails on first run. [cite_start]For example, add `almere1.jpg` and `almere2.jpg`. [cite: 6]

4.  **Build and Run:**
    * Open your terminal in the project root and run:
        ```bash
        docker-compose up --build
        ```

5.  **Access the Application:**
    * [cite_start]Open your web browser and navigate to `http://localhost:2075`. [cite: 8]