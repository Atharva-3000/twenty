import { Module } from '@nestjs/common';

import { AppModule } from 'src/app.module';
import { DatabaseCommandModule } from 'src/database/commands/database-command.module';
import { WorkflowsModule } from 'src/engine/core-modules/workflows/workflows.module';
import { WorkspaceCleanerModule } from 'src/engine/workspace-manager/workspace-cleaner/workspace-cleaner.module';
import { WorkspaceHealthCommandModule } from 'src/engine/workspace-manager/workspace-health/commands/workspace-health-command.module';
import { WorkspaceMigrationRunnerCommandsModule } from 'src/engine/workspace-manager/workspace-migration-runner/commands/workspace-sync-metadata-commands.module';
import { WorkspaceSyncMetadataCommandsModule } from 'src/engine/workspace-manager/workspace-sync-metadata/commands/workspace-sync-metadata-commands.module';

@Module({
  imports: [
    AppModule,
    WorkspaceSyncMetadataCommandsModule,
    DatabaseCommandModule,
    WorkspaceCleanerModule,
    WorkspaceHealthCommandModule,
    WorkspaceMigrationRunnerCommandsModule,
    WorkflowsModule,
  ],
})
export class CommandModule {}
