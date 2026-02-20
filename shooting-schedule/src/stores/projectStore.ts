import { create } from 'zustand';
import type { Project, Location, Accommodation, Meal, RestStop, Transport, Schedule } from '@/types';

interface ProjectState {
  projects: Project[];
  currentProject: (Project & {
    locations: Location[];
    accommodations: Accommodation[];
    meals: Meal[];
    restStops: RestStop[];
    transports: Transport[];
  }) | null;
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<Project | null>;
  archiveProject: (id: string) => Promise<void>;

  addLocation: (projectId: string, data: Partial<Location>) => Promise<Location | null>;
  addAccommodation: (projectId: string, data: Partial<Accommodation>) => Promise<Accommodation | null>;
  addMeal: (projectId: string, data: Partial<Meal>) => Promise<Meal | null>;
  addRestStop: (projectId: string, data: Partial<RestStop>) => Promise<RestStop | null>;
  addTransport: (projectId: string, data: Partial<Transport>) => Promise<Transport | null>;

  generateSchedule: (projectId: string) => Promise<Schedule | null>;
  fetchSchedules: (projectId: string) => Promise<void>;

  setError: (error: string | null) => void;
}

const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T | null> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json() as { success: boolean; data?: T };
  if (!json.success) return null;
  return json.data ?? null;
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  schedules: [],
  isLoading: false,
  error: null,

  setError: (error) => set({ error }),

  fetchProjects: async () => {
    set({ isLoading: true });
    const data = await apiFetch<Project[]>('/api/projects');
    set({ projects: data ?? [], isLoading: false });
  },

  fetchProject: async (id) => {
    set({ isLoading: true });
    const data = await apiFetch<ProjectState['currentProject']>(`/api/projects/${id}`);
    set({ currentProject: data ?? null, isLoading: false });
  },

  createProject: async (data) => {
    const project = await apiFetch<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (project) {
      set((state) => ({ projects: [project, ...state.projects] }));
    }
    return project;
  },

  updateProject: async (id, data) => {
    const project = await apiFetch<Project>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (project) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? project : p)),
        currentProject: state.currentProject?.id === id
          ? { ...state.currentProject, ...project }
          : state.currentProject,
      }));
    }
  },

  deleteProject: async (id) => {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
  },

  duplicateProject: async (id) => {
    const project = await apiFetch<Project>(`/api/projects/${id}/duplicate`, { method: 'POST' });
    if (project) {
      set((state) => ({ projects: [project, ...state.projects] }));
    }
    return project;
  },

  archiveProject: async (id) => {
    const project = await apiFetch<Project>(`/api/projects/${id}/archive`, { method: 'PUT' });
    if (project) {
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? project : p)),
      }));
    }
  },

  addLocation: async (projectId, data) => {
    const loc = await apiFetch<Location>(`/api/projects/${projectId}/locations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (loc && get().currentProject?.id === projectId) {
      set((state) => ({
        currentProject: state.currentProject
          ? { ...state.currentProject, locations: [...state.currentProject.locations, loc] }
          : null,
      }));
    }
    return loc;
  },

  addAccommodation: async (projectId, data) => {
    const item = await apiFetch<Accommodation>(`/api/projects/${projectId}/accommodations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (item && get().currentProject?.id === projectId) {
      set((state) => ({
        currentProject: state.currentProject
          ? { ...state.currentProject, accommodations: [...state.currentProject.accommodations, item] }
          : null,
      }));
    }
    return item;
  },

  addMeal: async (projectId, data) => {
    const item = await apiFetch<Meal>(`/api/projects/${projectId}/meals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (item && get().currentProject?.id === projectId) {
      set((state) => ({
        currentProject: state.currentProject
          ? { ...state.currentProject, meals: [...state.currentProject.meals, item] }
          : null,
      }));
    }
    return item;
  },

  addRestStop: async (projectId, data) => {
    const item = await apiFetch<RestStop>(`/api/projects/${projectId}/rest-stops`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (item && get().currentProject?.id === projectId) {
      set((state) => ({
        currentProject: state.currentProject
          ? { ...state.currentProject, restStops: [...state.currentProject.restStops, item] }
          : null,
      }));
    }
    return item;
  },

  addTransport: async (projectId, data) => {
    const item = await apiFetch<Transport>(`/api/projects/${projectId}/transports`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (item && get().currentProject?.id === projectId) {
      set((state) => ({
        currentProject: state.currentProject
          ? { ...state.currentProject, transports: [...state.currentProject.transports, item] }
          : null,
      }));
    }
    return item;
  },

  generateSchedule: async (projectId) => {
    const schedule = await apiFetch<Schedule>(`/api/projects/${projectId}/optimize`, {
      method: 'POST',
    });
    if (schedule) {
      set((state) => ({ schedules: [schedule, ...state.schedules] }));
    }
    return schedule;
  },

  fetchSchedules: async (projectId) => {
    const data = await apiFetch<Schedule[]>(`/api/projects/${projectId}/schedules`);
    set({ schedules: data ?? [] });
  },
}));
