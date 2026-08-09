import { Test, TestingModule } from '@nestjs/testing';
import { GeminiService } from './gemini.service';

describe('GeminiService - runAgentLoop Isolation Tests', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeminiService],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('should reject array responses and not corrupt accumulatedData', async () => {
    // Mock generateCompletion to return an array on first attempt, then a valid finish action
    const generateSpy = jest.spyOn(service, 'generateCompletion');
    generateSpy.mockResolvedValueOnce(
      JSON.stringify([
        { action: 'click', selector: 'button' }
      ])
    ).mockResolvedValueOnce(
      JSON.stringify({ action: 'finish', bio: 'My bio', posts: ['post 1'] })
    );

    const executeAction = jest.fn().mockResolvedValue({ feedback: 'done' });
    const getState = jest.fn().mockResolvedValue({ url: 'https://instagram.com/user/', elements: '' });

    const result = await service.runAgentLoop({
      label: 'instagram-scrape-posts',
      systemPrompt: 'Test prompt',
      buildUserPrompt: (attempt, max, state, feedback) => {
        if (attempt === 2) {
          // Verify that feedback was set correctly after the array rejection
          expect(feedback).toContain('You returned an array of multiple actions');
        }
        return 'test';
      },
      getState,
      executeAction,
      maxAttempts: 3,
    });

    expect(result.bio).toBe('My bio');
    expect(result.posts).toEqual(['post 1']);
    // Verify that the array was NOT accumulated (no numeric keys)
    expect(result['0']).toBeUndefined();
    expect(executeAction).toHaveBeenCalledTimes(0); // Only finish was accepted
  });

  it('should reject invalid/unrecognized actions', async () => {
    const generateSpy = jest.spyOn(service, 'generateCompletion');
    generateSpy.mockResolvedValueOnce(
      JSON.stringify({ action: 'invalid_action' })
    ).mockResolvedValueOnce(
      JSON.stringify({ action: 'finish', bio: 'My bio', posts: [] })
    );

    const executeAction = jest.fn().mockResolvedValue({ feedback: 'done' });
    const getState = jest.fn().mockResolvedValue({ url: 'https://instagram.com/user/', elements: '' });

    const result = await service.runAgentLoop({
      label: 'instagram-scrape-posts',
      systemPrompt: 'Test prompt',
      buildUserPrompt: (attempt, max, state, feedback) => {
        if (attempt === 2) {
          expect(feedback).toContain('action is not recognized');
        }
        return 'test';
      },
      getState,
      executeAction,
      maxAttempts: 3,
    });

    expect(result.bio).toBe('My bio');
    expect(executeAction).toHaveBeenCalledTimes(0);
  });

  it('should accumulate valid actions and advance pipeline stage', async () => {
    const generateSpy = jest.spyOn(service, 'generateCompletion');
    
    // We mock three attempts:
    // 1st: navigate/click to scrape bio, returns bio
    // 2nd: click/scrape post, returns a post
    // 3rd: finish
    generateSpy.mockResolvedValueOnce(
      JSON.stringify({ action: 'click', selector: 'a', bio: 'Found bio' })
    ).mockResolvedValueOnce(
      JSON.stringify({ action: 'click', selector: 'b', posts: ['first post'] })
    ).mockResolvedValueOnce(
      JSON.stringify({ action: 'finish' })
    );

    const executeAction = jest.fn().mockResolvedValue({ feedback: 'clicked' });
    const getState = jest.fn().mockResolvedValue({ url: 'https://instagram.com/user/', elements: '' });

    const result = await service.runAgentLoop({
      label: 'instagram-scrape-posts',
      systemPrompt: 'Test prompt',
      buildUserPrompt: (attempt, max, state, feedback) => {
        return 'test';
      },
      getState,
      executeAction,
      maxAttempts: 4,
    });

    expect(result.bio).toBe('Found bio');
    expect(result.posts).toEqual(['first post']);
    expect(executeAction).toHaveBeenCalledTimes(2);
  });

  it('should detect stuck state, escalate feedback, and abort early', async () => {
    const generateSpy = jest.spyOn(service, 'generateCompletion');
    
    // Always return the exact same invalid action structure
    generateSpy.mockResolvedValue(
      JSON.stringify({ action: 'click', selector: 'same-btn' })
    );

    // executeAction always returns the same feedback, creating identical state signature
    const executeAction = jest.fn().mockResolvedValue({ feedback: 'Same feedback' });
    // URL remains identical
    const getState = jest.fn().mockResolvedValue({ url: 'https://instagram.com/stuck', elements: '' });

    let feedbackSeen = '';
    let errorThrown: any = null;

    try {
      await service.runAgentLoop({
        label: 'instagram-scrape-posts',
        systemPrompt: 'Test prompt',
        buildUserPrompt: (attempt, max, state, feedback) => {
          if (feedback) {
            feedbackSeen = feedback;
          }
          return 'test';
        },
        getState,
        executeAction,
        maxAttempts: 10,
      });
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).toBeDefined();
    expect(errorThrown.message).toContain('Agent loop aborted early: loop detected');
    expect(feedbackSeen).toContain('STUCK STATE DETECTED!');
  });
});
