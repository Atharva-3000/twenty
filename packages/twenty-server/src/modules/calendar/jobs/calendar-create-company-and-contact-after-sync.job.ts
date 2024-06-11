import { Logger } from '@nestjs/common';

import { IsNull } from 'typeorm';

import { Processor } from 'src/engine/integrations/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/integrations/message-queue/message-queue.constants';
import { CalendarChannelWorkspaceEntity } from 'src/modules/calendar/standard-objects/calendar-channel.workspace-entity';
import { CalendarEventParticipantWorkspaceEntity } from 'src/modules/calendar/standard-objects/calendar-event-participant.workspace-entity';
import { CreateCompanyAndContactService } from 'src/modules/connected-account/auto-companies-and-contacts-creation/services/create-company-and-contact.service';
import { Process } from 'src/engine/integrations/message-queue/decorators/process.decorator';
import { InjectWorkspaceRepository } from 'src/engine/twenty-orm/decorators/inject-workspace-repository.decorator';
import { WorkspaceRepository } from 'src/engine/twenty-orm/repository/workspace.repository';

export type CalendarCreateCompanyAndContactAfterSyncJobData = {
  workspaceId: string;
  calendarChannelId: string;
};

@Processor(MessageQueue.calendarQueue)
export class CalendarCreateCompanyAndContactAfterSyncJob {
  private readonly logger = new Logger(
    CalendarCreateCompanyAndContactAfterSyncJob.name,
  );
  constructor(
    private readonly createCompanyAndContactService: CreateCompanyAndContactService,
    @InjectWorkspaceRepository(CalendarChannelWorkspaceEntity)
    private readonly calendarChannelRepository: WorkspaceRepository<CalendarChannelWorkspaceEntity>,
    @InjectWorkspaceRepository(CalendarEventParticipantWorkspaceEntity)
    private readonly calendarEventParticipantRepository: WorkspaceRepository<CalendarEventParticipantWorkspaceEntity>,
    @InjectObjectMetadataRepository(ConnectedAccountWorkspaceEntity)
    private readonly connectedAccountRepository: ConnectedAccountRepository,
  ) {}

  @Process(CalendarCreateCompanyAndContactAfterSyncJob.name)
  async handle(
    data: CalendarCreateCompanyAndContactAfterSyncJobData,
  ): Promise<void> {
    this.logger.log(
      `create contacts and companies after sync for workspace ${data.workspaceId} and calendarChannel ${data.calendarChannelId}`,
    );
    const { workspaceId, calendarChannelId } = data;

    const calendarChannel = await this.calendarChannelRepository.findOneBy({
      id: calendarChannelId,
    });

    if (!calendarChannel) {
      throw new Error(
        `Calendar channel with id ${calendarChannelId} not found in workspace ${workspaceId}`,
      );
    }

    const { handle, isContactAutoCreationEnabled, connectedAccountId } = calendarChannel;

    if (!isContactAutoCreationEnabled || !handle) {
      return;
    }

    const connectedAccount = await this.connectedAccountRepository.getById(
      connectedAccountId,
      workspaceId,
    );

    if (!connectedAccount) {
      throw new Error(
        `Connected account with id ${connectedAccountId} not found in workspace ${workspaceId}`,
      );
    }

    const calendarEventParticipantsWithoutPersonIdAndWorkspaceMemberId =
      await this.calendarEventParticipantRepository.find({
        where: {
          calendarEvent: {
            calendarChannelEventAssociations: {
              calendarChannelId,
            },
            calendarEventParticipants: {
              personId: IsNull(),
              workspaceMemberId: IsNull(),
            },
          },
        },
        relations: [
          'calendarEvent.calendarChannelEventAssociations',
          'calendarEvent.calendarEventParticipants',
        ],
      });

    await this.createCompanyAndContactService.createCompaniesAndContactsAndUpdateParticipants(
      connectedAccount,
      calendarEventParticipantsWithoutPersonIdAndWorkspaceMemberId,
      workspaceId,
    );

    this.logger.log(
      `create contacts and companies after sync for workspace ${data.workspaceId} and calendarChannel ${data.calendarChannelId} done`,
    );
  }
}
