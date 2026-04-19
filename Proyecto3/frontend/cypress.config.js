import { defineConfig } from 'cypress'

export default defineConfig({
  video: false,
  screenshotOnRunFailure: true,
  screenshotsFolder: '../evidence/cypress/screenshots',
  videosFolder: '../evidence/cypress/videos',
  downloadsFolder: '../evidence/cypress/downloads',
  e2e: {
    baseUrl: 'http://127.0.0.1:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
  },
})
