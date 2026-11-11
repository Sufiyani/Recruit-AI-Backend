import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { ScheduleInterviewInput, UpdateInterviewInput } from '../validators/interview.validator';
import { InterviewStatus, ApplicationStatus, Prisma } from '@prisma/client';
import { notificationService } from './notification.service';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class InterviewService {
  async schedule(data: ScheduleInterviewInput, companyId: string) {
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
      include: {
        job: { select: { title: true, companyId: true, company: { select: { name: true } } } },
        candidate: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!application) throw new NotFoundError('Application');
    if (application.job.companyId !== companyId) throw new ForbiddenError('Access denied');

    const interview = await prisma.interview.create({
      data: {
        applicationId: data.applicationId,
        title: data.title || 'AI Technical Interview',
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration || 60,
        meetingLink: data.meetingLink,
        notes: data.notes,
      },
      include: { application: { include: { job: { select: { title: true } } } } },
    });

    const directMeetingLink =
      interview.meetingLink || `${config.frontendUrl}/candidate/interviews/${interview.id}`;

    if (!interview.meetingLink) {
      await prisma.interview.update({
        where: { id: interview.id },
        data: { meetingLink: directMeetingLink },
      });
    }

    // Notify candidate
    await notificationService.create({
      userId: application.candidate.user.id,
      title: 'Interview Scheduled',
      message: `Your interview for "${application.job.title}" has been scheduled on ${new Date(data.scheduledAt).toLocaleDateString()}.`,
      type: 'INTERVIEW',
      link: `/candidate/applications/${data.applicationId}`,
    });

    // Dispatch n8n Agent 1 Webhook for Candidate Invitation Email
    const n8nWebhookUrl = config.n8n?.webhookInterviewScheduled;
    if (n8nWebhookUrl) {
      const scheduledDate = new Date(interview.scheduledAt);
      const formattedDate = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Karachi',
      });
      const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Karachi',
      });
      const fullFormattedPKT = `${formattedDate} at ${formattedTime} PKT`;

      const payload = {
        event: 'interview.scheduled',
        interviewId: interview.id,

        // Direct top-level fields for easy mapping
        candidateName: `${application.candidate.user.firstName} ${application.candidate.user.lastName}`.trim(),
        candidateEmail: application.candidate.user.email,
        jobTitle: application.job.title,
        job_title: application.job.title,
        position: application.job.title,
        title: application.job.title, // Ensures n8n gets job title even if looking for 'title'
        companyName: application.job.company?.name || 'Company',
        meetingLink: directMeetingLink,
        meeting_link: directMeetingLink,

        // Formatted Time & Date (PKT)
        scheduledAt: interview.scheduledAt.toISOString(),
        scheduled_at: interview.scheduledAt.toISOString(),
        scheduledTime: fullFormattedPKT,
        scheduled_time: fullFormattedPKT,
        interviewTime: fullFormattedPKT,
        date: formattedDate,
        time: formattedTime,
        timePKT: formattedTime,
        when: fullFormattedPKT,

        // Nested objects
        candidate: {
          id: application.candidate.user.id,
          firstName: application.candidate.user.firstName,
          lastName: application.candidate.user.lastName,
          fullName: `${application.candidate.user.firstName} ${application.candidate.user.lastName}`.trim(),
          name: `${application.candidate.user.firstName} ${application.candidate.user.lastName}`.trim(),
          email: application.candidate.user.email,
        },
        job: {
          title: application.job.title,
          role: application.job.title,
          position: application.job.title,
          companyName: application.job.company?.name || 'Company',
        },
        interview: {
          id: interview.id,
          title: application.job.title, // Set to job title so $json.interview.title returns role
          interviewRoundTitle: interview.title,
          scheduledAt: interview.scheduledAt.toISOString(),
          scheduledAtFormatted: fullFormattedPKT,
          date: formattedDate,
          time: formattedTime,
          durationMinutes: interview.duration,
          meetingLink: directMeetingLink,
          notes: interview.notes || '',
        },
      };

      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err: any) => {
        logger.warn(`Failed to dispatch n8n interview-scheduled webhook: ${err.message}`);
      });
    }

    return interview;
  }

  async update(interviewId: string, data: UpdateInterviewInput, companyId: string) {
    const interview = await this._findOrFail(interviewId, companyId);
    return prisma.interview.update({
      where: { id: interviewId },
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });
  }

  // ─── n8n Decision Webhook ────────────────────────────────────────────────
  private async notifyDecisionMade(interviewId: string): Promise<void> {
    const webhookUrl = config.n8n?.webhookInterviewDecision;
    if (!webhookUrl) return;

    try {
      // Fetch full interview with all relations needed for the payload
      const interview = await prisma.interview.findUnique({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              job: { select: { title: true } },
              candidate: {
                include: {
                  user: { select: { firstName: true, lastName: true, email: true } },
                },
              },
            },
          },
        },
      });

      if (!interview) return;

      const candidate = interview.application.candidate.user;
      const job = interview.application.job;
      const applicationStatus = interview.application.status; // e.g. SHORTLISTED / REJECTED

      // Only fire for final HR decisions
      if (applicationStatus !== 'SHORTLISTED' && applicationStatus !== 'REJECTED') return;

      // Parse the Gemini final report stored as JSON string in feedback
      let feedbackSummary = '';
      let strengths: string[] = [];
      let improvements: string[] = [];

      if (interview.feedback) {
        try {
          const report = JSON.parse(interview.feedback);
          feedbackSummary = report.summary || interview.aiSummary || '';
          strengths = Array.isArray(report.strengths) ? report.strengths : [];
          improvements = Array.isArray(report.areasOfImprovement)
            ? report.areasOfImprovement
            : [];
        } catch {
          // feedback is not JSON — fall back to plain aiSummary
          feedbackSummary = interview.aiSummary || '';
        }
      } else {
        feedbackSummary = interview.aiSummary || '';
      }

      const payload = {
        event: 'interview.decision_made',
        interviewId: interview.id,
        decision: {
          status: applicationStatus,                          // "SHORTLISTED" or "REJECTED"
          hrNotes: interview.application.notes || '',
        },
        candidate: {
          fullName: `${candidate.firstName} ${candidate.lastName}`.trim(),
          email: candidate.email,
        },
        job: {
          title: job.title,
        },
        feedback: {
          summary: feedbackSummary,
          strengths,
          improvements,
        },
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      logger.info(`n8n decision webhook dispatched for interview ${interviewId} — ${applicationStatus}`);
    } catch (err: any) {
      // Never let a webhook failure break the HR action
      logger.warn(`Failed to dispatch n8n decision webhook: ${err.message}`);
    }
  }

  async updateStatus(
    interviewId: string,
    data: {
      status?: InterviewStatus;
      applicationStatus?: ApplicationStatus;
      feedback?: string;
      notes?: string;
    },
    companyId?: string
  ) {
    const interview = await this._findOrFail(interviewId, companyId);

    const updateData: Prisma.InterviewUpdateInput = {};
    if (data.status) updateData.status = data.status;
    if (data.feedback !== undefined) updateData.feedback = data.feedback;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (Object.keys(updateData).length > 0) {
      await prisma.interview.update({
        where: { id: interviewId },
        data: updateData,
      });
    }

    if (data.applicationStatus) {
      await prisma.application.update({
        where: { id: interview.applicationId },
        data: {
          status: data.applicationStatus,
          ...(data.notes ? { notes: data.notes } : {}),
        },
      });

      // Send notification to candidate about HR status update
      try {
        const candidateUserId = interview.application.candidate.user.id;
        const jobTitle = interview.application.job.title;
        let title = 'Application Status Updated';
        let message = `Your application for "${jobTitle}" has been updated to ${data.applicationStatus}.`;

        if (data.applicationStatus === 'SHORTLISTED') {
          title = 'Application Shortlisted 🎉';
          message = `Congratulations! You have been SHORTLISTED for "${jobTitle}" following your interview evaluation.`;
        } else if (data.applicationStatus === 'REJECTED') {
          title = 'Application Update';
          message = `Thank you for interviewing for "${jobTitle}". The hiring team has updated your application status.`;
        } else if (data.applicationStatus === 'REVIEWING') {
          title = 'Interview Under Review 🔍';
          message = `Your interview evaluation for "${jobTitle}" is currently under review by the hiring manager.`;
        }

        await notificationService.create({
          userId: candidateUserId,
          title,
          message,
          type: 'APPLICATION',
          link: `/candidate/applications`,
        });
      } catch {
        // Notification error should not fail the update
      }

      // Fire n8n decision webhook (fire-and-forget, never throws)
      this.notifyDecisionMade(interviewId);
    }

    return prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: {
              include: {
                company: { select: { id: true, name: true, logoUrl: true } },
              },
            },
            candidate: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
              },
            },
          },
        },
      },
    });
  }

  async getByApplication(applicationId: string) {
    return prisma.interview.findMany({
      where: { applicationId },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async getCandidateInterviews(userId: string, query: {
    page?: number; limit?: number; status?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InterviewWhereInput = {
      application: { candidate: { user: { id: userId } } },
      ...(query.status && { status: query.status as InterviewStatus }),
    };

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: { select: { id: true, name: true, logoUrl: true, industry: true } },
                },
              },
            },
          },
        },
      }),
      prisma.interview.count({ where }),
    ]);

    return { data: interviews, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getCompanyInterviews(companyId: string, query: {
    page?: number; limit?: number; status?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InterviewWhereInput = {
      application: { job: { companyId } },
      ...(query.status && { status: query.status as InterviewStatus }),
    };

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          application: {
            include: {
              job: { select: { id: true, title: true, location: true, type: true } },
              candidate: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      }),
      prisma.interview.count({ where }),
    ]);

    return { data: interviews, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getAllInterviews(query: {
    page?: number;
    limit?: number;
    companyId?: string;
    status?: string;
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.InterviewWhereInput = {
      ...(query.companyId && { application: { job: { companyId: query.companyId } } }),
      ...(query.status && { status: query.status as InterviewStatus }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { application: { job: { title: { contains: query.search, mode: 'insensitive' } } } },
          { application: { candidate: { user: { firstName: { contains: query.search, mode: 'insensitive' } } } } },
          { application: { candidate: { user: { lastName: { contains: query.search, mode: 'insensitive' } } } } },
          { application: { candidate: { user: { email: { contains: query.search, mode: 'insensitive' } } } } },
          { application: { job: { company: { name: { contains: query.search, mode: 'insensitive' } } } } },
        ],
      }),
    };

    const [interviews, total] = await Promise.all([
      prisma.interview.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          application: {
            include: {
              job: {
                include: {
                  company: { select: { id: true, name: true, slug: true, logoUrl: true, industry: true } },
                },
              },
              candidate: {
                include: {
                  user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
                },
              },
            },
          },
        },
      }),
      prisma.interview.count({ where }),
    ]);

    return { data: interviews, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(interviewId: string, user: { id: string; role: string; companyId?: string }) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: {
              include: {
                company: { select: { id: true, name: true, logoUrl: true } },
              },
            },
            candidate: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!interview) throw new NotFoundError('Interview');

    // Access check: Either Company Admin of the job OR Candidate who applied OR Super Admin
    if (user.role === 'COMPANY_ADMIN') {
      if (interview.application.job.companyId !== user.companyId) {
        throw new ForbiddenError('Access denied');
      }
    } else if (user.role === 'CANDIDATE') {
      if (interview.application.candidate.user.id !== user.id) {
        throw new ForbiddenError('Access denied');
      }
    }

    return interview;
  }

  async startAiInterview(interviewId: string, userId: string) {
    const interview = await this.getById(interviewId, { id: userId, role: 'CANDIDATE' });

    // Enforce schedule timing: Candidate cannot start before scheduled time
    const scheduledTime = new Date(interview.scheduledAt).getTime();
    const now = Date.now();
    // Allow up to 5 minutes grace window before scheduled time
    const fiveMinutesBefore = scheduledTime - 5 * 60 * 1000;
    if (now < fiveMinutesBefore) {
      throw new ForbiddenError(
        `This interview is scheduled for ${new Date(interview.scheduledAt).toLocaleString()}. You cannot start the interview before your scheduled time.`
      );
    }

    // If already has questions, return existing
    const existingQuestions = (interview.aiQuestions as any[]) || [];
    if (existingQuestions.length > 0) {
      return {
        interview,
        questions: existingQuestions,
      };
    }

    // Generate questions using Gemini
    const { geminiService } = await import('./gemini.service');
    const job = interview.application.job;
    const candidate = interview.application.candidate;

    const questions = await geminiService.generateInterviewQuestions({
      jobTitle: job.title,
      jobDescription: job.description,
      jobRequirements: job.requirements || '',
      candidateName: `${candidate.user.firstName} ${candidate.user.lastName}`,
      candidateSkills: candidate.skills,
    });

    // Format initial questions with empty answers
    const initializedQuestions = questions.map((q) => ({
      ...q,
      candidateAnswer: null,
      score: null,
      feedback: null,
      strengths: [],
      improvements: [],
    }));

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        aiQuestions: initializedQuestions,
      },
    });

    return {
      interview: updated,
      questions: initializedQuestions,
    };
  }

  async submitAiAnswer(
    interviewId: string,
    userId: string,
    data: {
      questionIndex: number;
      answerText: string;
      snapshot?: string;
      proctoringMetrics?: {
        tabSwitches?: number;
        windowBlurs?: number;
        fullscreenExits?: number;
        timeTakenSeconds?: number;
      };
    }
  ) {
    const interview = await this.getById(interviewId, { id: userId, role: 'CANDIDATE' });
    const questions = ((interview.aiQuestions as any[]) || []).slice();

    if (data.questionIndex < 0 || data.questionIndex >= questions.length) {
      throw new Error('Invalid question index');
    }

    const currentQ = questions[data.questionIndex];
    const { geminiService } = await import('./gemini.service');

    const evaluation = await geminiService.evaluateAnswer({
      jobTitle: interview.application.job.title,
      question: currentQ.question,
      category: currentQ.category || 'Technical',
      candidateAnswer: data.answerText,
      snapshot: data.snapshot,
      proctoringMetrics: data.proctoringMetrics,
    });

    // Store evaluation, body language, and anti-cheat assessment on the question
    questions[data.questionIndex] = {
      ...currentQ,
      candidateAnswer: data.answerText,
      score: evaluation.score,
      feedback: evaluation.feedback,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      bodyLanguage: evaluation.bodyLanguage,
      antiCheat: evaluation.antiCheat,
      answeredAt: new Date().toISOString(),
    };

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: { aiQuestions: questions },
    });

    return {
      evaluation,
      questionIndex: data.questionIndex,
      isLastQuestion: data.questionIndex === questions.length - 1,
      questions,
      interview: updated,
    };
  }

  async completeAiInterview(
    interviewId: string,
    userId: string,
    proctoringSummary?: {
      totalTabSwitches?: number;
      totalFullscreenExits?: number;
      suspiciousEvents?: string[];
      cameraEnabled?: boolean;
    }
  ) {
    const interview = await this.getById(interviewId, { id: userId, role: 'CANDIDATE' });
    const questions = (interview.aiQuestions as any[]) || [];

    const qaHistory = questions
      .filter((q) => q.candidateAnswer)
      .map((q) => ({
        question: q.question,
        category: q.category,
        answer: q.candidateAnswer,
        score: q.score || 7,
        bodyLanguage: q.bodyLanguage,
        antiCheat: q.antiCheat,
      }));

    const { geminiService } = await import('./gemini.service');
    const finalReport = await geminiService.generateFinalSummary({
      jobTitle: interview.application.job.title,
      qaHistory,
      proctoringSummary,
    });

    const integrityInfo = finalReport.proctoringReport
      ? ` | Anti-Cheat Trust: ${finalReport.proctoringReport.integrityScore}% (${finalReport.proctoringReport.cheatingRisk} Risk) | Body Language: ${finalReport.bodyLanguageScore}%`
      : '';

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.COMPLETED,
        aiScore: finalReport.overallScore,
        aiSummary: `${finalReport.recommendation}: ${finalReport.summary}${integrityInfo}`,
        feedback: JSON.stringify(finalReport),
      },
      include: {
        application: {
          include: {
            job: { select: { title: true, companyId: true, createdById: true } },
            candidate: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    });

    // Update Application aiScore as well
    await prisma.application.update({
      where: { id: interview.applicationId },
      data: {
        aiScore: finalReport.overallScore,
        status: 'REVIEWING',
      },
    });

    // Notify HR / Company Admin
    try {
      await notificationService.create({
        userId: updated.application.job.createdById,
        title: 'Voice Interview Completed 🎉',
        message: `${updated.application.candidate.user.firstName} completed the AI Voice Interview for "${updated.application.job.title}" with score ${finalReport.overallScore}% (${finalReport.recommendation}). Anti-Cheat Trust: ${finalReport.proctoringReport?.integrityScore || 95}%, Body Language: ${finalReport.bodyLanguageScore || 88}%.`,
        type: 'INTERVIEW',
        link: `/hr/interviews`,
      });
    } catch {
      // notification shouldn't break completion flow
    }

    return {
      interview: updated,
      finalReport,
    };
  }

  private async _findOrFail(interviewId: string, companyId?: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            job: { select: { title: true, companyId: true } },
            candidate: { include: { user: { select: { id: true, firstName: true } } } },
          },
        },
      },
    });
    if (!interview) throw new NotFoundError('Interview');
    if (companyId && interview.application.job.companyId !== companyId) {
      throw new ForbiddenError('Access denied');
    }
    return interview;
  }
}

export const interviewService = new InterviewService();
