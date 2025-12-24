# Project Rules

1. **Docker Commands**: Always use `sudo` when running `docker` or `docker-compose` commands.
   - Example: `sudo docker-compose up -d`
2. **Git Workflow**: Automatically commit changes after completing a task.
   - Format: `feat: <Task Description>` or `fix: <Bug Description>`
3. **Push on Finish**: After finishing a task and committing, always push the changes to the remote repository.
   - Use the `finish_task` workflow or run `git push origin <branch_name>`.
4. **Environment Configuration**: Usage of a single `.env` file at the project root and a single `.env.example` is mandatory.
   - The backend and frontend must verify configurations from this centralized file or through parameterized docker-compose variables.
5. **Docker Testing**: All tests for each part of the project must be run using Docker. Do not run tests on the local machine without Docker.

