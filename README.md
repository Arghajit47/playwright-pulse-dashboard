# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.
bash
    git clone https://github.com/firebase/studio
    cd studio
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Connect to your Firebase Project:**
    You can connect to your Firebase project locally using the Firebase CLI or by providing your project configuration directly.

    *   **Using Firebase CLI (Recommended for development):**
        Make sure you have the Firebase CLI installed and logged in (`firebase login`). Then, use the Firebase emulator suite:
        ```bash
        firebase emulators:start --import=./firebase-emulator-data --export-on-exit
        ```
        This command starts the emulators and imports data from `./firebase-emulator-data` if it exists, exporting data on exit. Your Next.js application will automatically connect to the running emulators.

    *   **Using Firebase Project Configuration (For production or remote development):**
        Copy the `.env.local.example` file to `.env.local` and fill in your Firebase project configuration details.
        ```bash
        cp .env.local.example .env.local
        ```
        Edit `.env.local` with your project's API Key, Auth Domain, Project ID, etc.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

### Project Structure

-   `src/app`: Next.js application pages.
-   `src/components`: Reusable React components.
-   `src/lib`: Utility functions and Firebase initialization.

### Deployment

This project can be deployed to Firebase Hosting or any platform supporting Next.js applications.

**Deploying to Firebase Hosting:**

1.  Install the Firebase CLI if you haven't already:
    ```bash
    npm install -g firebase-tools
    ```
2.  Log in to Firebase:
    ```bash
    firebase login
    ```
3.  Initialize your project for Firebase Hosting:
    ```bash
    firebase init hosting
    ```
    Follow the prompts. For the public directory, use `out` (since we will export a static site). Configure as a single-page app and set up automatic builds and deploys with GitHub if desired.
4.  Build your Next.js application for static export:
    ```bash
    npm run build
    npm run export
    ```
    This creates a static `out` directory.
5.  Deploy to Firebase Hosting:
    ```bash
    firebase deploy --only hosting
    ```

### Contributing

We welcome contributions! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### License

This project is licensed under the Apache 2.0 License. See the [LICENSE](LICENSE) file for details.

### Support

For questions or issues, please open an issue on the GitHub repository.
To use Firebase Hosting:
