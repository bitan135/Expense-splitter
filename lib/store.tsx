"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";
import { Group, Expense } from "@/types";

// State Shape
interface AppState {
    groups: Group[];
    activeGroupId: string | null;
    loaded: boolean;
}

// Actions
type Action =
    | { type: "LOAD_STATE"; payload: AppState }
    | { type: "CREATE_GROUP"; payload: { name: string } }
    | { type: "DELETE_GROUP"; payload: { id: string } }
    | { type: "SET_ACTIVE_GROUP"; payload: { id: string | null } }
    | { type: "ADD_MEMBER"; payload: { groupId: string; name: string } }
    | { type: "ADD_EXPENSE"; payload: { groupId: string; expense: Expense } }
    | { type: "DELETE_EXPENSE"; payload: { groupId: string; expenseId: string } };

// Initial State
const initialState: AppState = {
    groups: [],
    activeGroupId: null,
    loaded: false,
};

// Reducer
const reducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case "LOAD_STATE":
            return { ...action.payload, loaded: true };

        case "CREATE_GROUP": {
            const newGroup: Group = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2),
                name: action.payload.name,
                members: [],
                expenses: [],
                currency: "INR",
                lastUpdated: Date.now(),
            };
            return { ...state, groups: [...state.groups, newGroup] };
        }

        case "DELETE_GROUP":
            return {
                ...state,
                groups: state.groups.filter((g) => g.id !== action.payload.id),
                activeGroupId: state.activeGroupId === action.payload.id ? null : state.activeGroupId,
            };

        case "SET_ACTIVE_GROUP":
            return { ...state, activeGroupId: action.payload.id };

        case "ADD_MEMBER":
            return {
                ...state,
                groups: state.groups.map((g) => {
                    if (g.id !== action.payload.groupId) return g;
                    return {
                        ...g,
                        members: [
                            ...g.members,
                            {
                                id: Date.now().toString(36) + Math.random().toString(36).slice(2),
                                name: action.payload.name,
                            },
                        ],
                        lastUpdated: Date.now(),
                    };
                }),
            };

        case "ADD_EXPENSE":
            return {
                ...state,
                groups: state.groups.map((g) => {
                    if (g.id !== action.payload.groupId) return g;
                    return {
                        ...g,
                        expenses: [...g.expenses, action.payload.expense],
                        lastUpdated: Date.now(),
                    };
                }),
            };

        case "DELETE_EXPENSE":
            return {
                ...state,
                groups: state.groups.map((g) => {
                    if (g.id !== action.payload.groupId) return g;
                    return {
                        ...g,
                        expenses: g.expenses.filter((e) => e.id !== action.payload.expenseId),
                        lastUpdated: Date.now(),
                    };
                }),
            };

        default:
            return state;
    }
};

// Context
const StoreContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<Action>;
} | null>(null);

// Provider
export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Load from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem("expense-splitter-state");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                dispatch({ type: "LOAD_STATE", payload: parsed });
            } catch (e) {
                console.error("Failed to load state", e);
            }
        } else {
            // Just trigger loaded
            dispatch({ type: "LOAD_STATE", payload: initialState });
        }
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        if (state.loaded) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { loaded, ...persistedState } = state;
            localStorage.setItem("expense-splitter-state", JSON.stringify(persistedState));
        }
    }, [state]);

    return (
        <StoreContext.Provider value={{ state, dispatch }}>
            {children}
        </StoreContext.Provider>
    );
};

// Hook
export const useStore = () => {
    const context = useContext(StoreContext);
    if (!context) throw new Error("useStore must be used within StoreProvider");
    return context;
};
