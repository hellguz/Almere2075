# Almere 2075 App

This application generates futuristic, sustainable architectural concepts for locations in Almere based on user-uploaded images.

## Architecture

- **Frontend:** React (Vite + JS)
- **Backend:** FastAPI (Python)
- **Proxy:** Nginx
- **Containerization:** Docker & Docker Compose

## How to Run

1.  **Prerequisites:**
    * Docker
    * Docker Compose

2.  **API Keys:**
    * Create a `.env` file in the root directory.
    * Fill in your `OPENAI_API_KEY` and `REPLICATE_API_KEY`.

3.  **Example Images:**
    * Place your example JPEG or PNG images inside the `./backend/images/` directory. The application will automatically generate thumbnails on first run. For example, add `almere1.jpg` and `almere2.jpg`.

4.  **Build and Run:**
    * Open your terminal in the project root and run:
        ```bash
        docker-compose up --build
        ```

5.  **Access the Application:**
    * Open your web browser and navigate to `http://localhost:2075`.

