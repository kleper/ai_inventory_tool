# Project Rules

1. **Docker Commands**: Always use `sudo` when running `docker` or `docker-compose` commands.
   - Example: `sudo docker-compose up -d`
2. **Git Workflow**: Automatically commit changes after completing a task.
   - Format: `feat: <Task Description>` or `fix: <Bug Description>`
3. **Push on Finish**: After finishing a task and committing, always push the changes to the remote repository.
   - Use the `finish_task` workflow or run `git push origin <branch_name>`.
