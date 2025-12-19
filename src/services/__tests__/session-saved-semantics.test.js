/**
 * Session Saved Semantics Test Suite
 * 
 * Verifies that the isSaved flag behavior is consistent across:
 * - Session storage (disk persistence)
 * - Session retrieval (getAllSessions, loadSession)
 * - Toggle functionality (toggleSessionSaved, setSessionSaved)
 * - UI filtering (saved-only filter)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import SessionStorage from '../session-storage.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('Session Saved Semantics', () => {
  let sessionStorage
  let testDir

  beforeEach(async () => {
    // Create a temporary directory for test sessions
    testDir = path.join(os.tmpdir(), `shade-test-${Date.now()}`)
    await fs.mkdir(testDir, { recursive: true })
    sessionStorage = new SessionStorage(testDir)
  })

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  describe('isSaved Flag Persistence', () => {
    it('should save session with isSaved: false by default', async () => {
      const session = {
        id: 'test-session-1',
        title: 'Test Session',
        messages: [
          { id: 'msg1', type: 'user', text: 'Hello', timestamp: new Date().toISOString() }
        ]
      }

      const saved = await sessionStorage.saveSession(session)
      expect(saved.isSaved).toBe(false)

      const loaded = await sessionStorage.loadSession('test-session-1')
      expect(loaded.isSaved).toBe(false)
    })

    it('should persist isSaved: true when explicitly set', async () => {
      const session = {
        id: 'test-session-2',
        title: 'Saved Session',
        isSaved: true,
        messages: [
          { id: 'msg1', type: 'user', text: 'Important message', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      const loaded = await sessionStorage.loadSession('test-session-2')
      expect(loaded.isSaved).toBe(true)
    })

    it('should persist isSaved: false when explicitly set', async () => {
      const session = {
        id: 'test-session-3',
        title: 'Unsaved Session',
        isSaved: false,
        messages: [
          { id: 'msg1', type: 'user', text: 'Temporary message', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      const loaded = await sessionStorage.loadSession('test-session-3')
      expect(loaded.isSaved).toBe(false)
    })
  })

  describe('Toggle Saved Functionality', () => {
    it('should toggle isSaved from false to true', async () => {
      const session = {
        id: 'test-toggle-1',
        title: 'Toggle Test',
        isSaved: false,
        messages: [
          { id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      const toggled = await sessionStorage.toggleSessionSaved('test-toggle-1')
      expect(toggled.isSaved).toBe(true)
      
      const loaded = await sessionStorage.loadSession('test-toggle-1')
      expect(loaded.isSaved).toBe(true)
    })

    it('should toggle isSaved from true to false', async () => {
      const session = {
        id: 'test-toggle-2',
        title: 'Toggle Test 2',
        isSaved: true,
        messages: [
          { id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      const toggled = await sessionStorage.toggleSessionSaved('test-toggle-2')
      expect(toggled.isSaved).toBe(false)
      
      const loaded = await sessionStorage.loadSession('test-toggle-2')
      expect(loaded.isSaved).toBe(false)
    })

    it('should toggle multiple times correctly', async () => {
      const session = {
        id: 'test-toggle-3',
        title: 'Multiple Toggle Test',
        isSaved: false,
        messages: [
          { id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      // Toggle to true
      let result = await sessionStorage.toggleSessionSaved('test-toggle-3')
      expect(result.isSaved).toBe(true)
      
      // Toggle to false
      result = await sessionStorage.toggleSessionSaved('test-toggle-3')
      expect(result.isSaved).toBe(false)
      
      // Toggle to true again
      result = await sessionStorage.toggleSessionSaved('test-toggle-3')
      expect(result.isSaved).toBe(true)
      
      const loaded = await sessionStorage.loadSession('test-toggle-3')
      expect(loaded.isSaved).toBe(true)
    })
  })

  describe('Set Saved Functionality', () => {
    it('should set isSaved to true', async () => {
      const session = {
        id: 'test-set-1',
        title: 'Set Test',
        isSaved: false,
        messages: [
          { id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      const result = await sessionStorage.setSessionSaved('test-set-1', true)
      expect(result.isSaved).toBe(true)
      
      const loaded = await sessionStorage.loadSession('test-set-1')
      expect(loaded.isSaved).toBe(true)
    })

    it('should set isSaved to false', async () => {
      const session = {
        id: 'test-set-2',
        title: 'Set Test 2',
        isSaved: true,
        messages: [
          { id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      const result = await sessionStorage.setSessionSaved('test-set-2', false)
      expect(result.isSaved).toBe(false)
      
      const loaded = await sessionStorage.loadSession('test-set-2')
      expect(loaded.isSaved).toBe(false)
    })

    it('should be idempotent when setting to same value', async () => {
      const session = {
        id: 'test-set-3',
        title: 'Idempotent Test',
        isSaved: true,
        messages: [
          { id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }
        ]
      }

      await sessionStorage.saveSession(session)
      
      // Set to true when already true
      let result = await sessionStorage.setSessionSaved('test-set-3', true)
      expect(result.isSaved).toBe(true)
      
      // Set to true again
      result = await sessionStorage.setSessionSaved('test-set-3', true)
      expect(result.isSaved).toBe(true)
      
      const loaded = await sessionStorage.loadSession('test-set-3')
      expect(loaded.isSaved).toBe(true)
    })
  })

  describe('Get All Sessions with isSaved', () => {
    beforeEach(async () => {
      // Create multiple sessions with different isSaved states
      const sessions = [
        {
          id: 'session-saved-1',
          title: 'Saved Session 1',
          isSaved: true,
          messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
        },
        {
          id: 'session-unsaved-1',
          title: 'Unsaved Session 1',
          isSaved: false,
          messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
        },
        {
          id: 'session-saved-2',
          title: 'Saved Session 2',
          isSaved: true,
          messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
        },
        {
          id: 'session-unsaved-2',
          title: 'Unsaved Session 2',
          isSaved: false,
          messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
        },
        {
          id: 'session-default',
          title: 'Default Session',
          // No isSaved field (should default to false)
          messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
        }
      ]

      for (const session of sessions) {
        await sessionStorage.saveSession(session)
      }
    })

    it('should return all sessions with correct isSaved flags', async () => {
      const sessions = await sessionStorage.getAllSessions()
      
      expect(sessions.length).toBe(5)
      
      const saved1 = sessions.find(s => s.id === 'session-saved-1')
      expect(saved1.isSaved).toBe(true)
      
      const unsaved1 = sessions.find(s => s.id === 'session-unsaved-1')
      expect(unsaved1.isSaved).toBe(false)
      
      const saved2 = sessions.find(s => s.id === 'session-saved-2')
      expect(saved2.isSaved).toBe(true)
      
      const unsaved2 = sessions.find(s => s.id === 'session-unsaved-2')
      expect(unsaved2.isSaved).toBe(false)
      
      const defaultSession = sessions.find(s => s.id === 'session-default')
      expect(defaultSession.isSaved).toBe(false)
    })

    it('should allow filtering saved sessions in application logic', async () => {
      const allSessions = await sessionStorage.getAllSessions()
      const savedSessions = allSessions.filter(s => s.isSaved)
      
      expect(savedSessions.length).toBe(2)
      expect(savedSessions.every(s => s.isSaved)).toBe(true)
      expect(savedSessions.map(s => s.id).sort()).toEqual(['session-saved-1', 'session-saved-2'].sort())
    })

    it('should allow filtering unsaved sessions in application logic', async () => {
      const allSessions = await sessionStorage.getAllSessions()
      const unsavedSessions = allSessions.filter(s => !s.isSaved)
      
      expect(unsavedSessions.length).toBe(3)
      expect(unsavedSessions.every(s => !s.isSaved)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle isSaved with non-boolean values', async () => {
      const session = {
        id: 'test-edge-1',
        title: 'Edge Test',
        isSaved: 'true', // String instead of boolean
        messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
      }

      await sessionStorage.saveSession(session)
      const loaded = await sessionStorage.loadSession('test-edge-1')
      
      // Should be coerced to boolean true
      expect(loaded.isSaved).toBe(true)
    })

    it('should handle isSaved with undefined', async () => {
      const session = {
        id: 'test-edge-2',
        title: 'Edge Test 2',
        isSaved: undefined,
        messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
      }

      await sessionStorage.saveSession(session)
      const loaded = await sessionStorage.loadSession('test-edge-2')
      
      // Should default to false
      expect(loaded.isSaved).toBe(false)
    })

    it('should handle isSaved with null', async () => {
      const session = {
        id: 'test-edge-3',
        title: 'Edge Test 3',
        isSaved: null,
        messages: [{ id: 'msg1', type: 'user', text: 'Test', timestamp: new Date().toISOString() }]
      }

      await sessionStorage.saveSession(session)
      const loaded = await sessionStorage.loadSession('test-edge-3')
      
      // Should default to false
      expect(loaded.isSaved).toBe(false)
    })
  })
})
