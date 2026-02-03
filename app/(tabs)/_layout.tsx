import { Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        tabBarStyle: {
          display: "none",
          height: 0,
          padding: 0,
          margin: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: "transparent",
        tabBarInactiveTintColor: "transparent",
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="change-password" />
      <Tabs.Screen name="company" />
      <Tabs.Screen name="danger" />
      <Tabs.Screen name="galerie" />
      <Tabs.Screen name="constat" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="prospects" />
      <Tabs.Screen name="qualiphoto" />
      <Tabs.Screen name="users" />
      <Tabs.Screen name="parameters" />
      <Tabs.Screen name="anomalie1" />
      <Tabs.Screen name="anomalie2" />
    </Tabs>
  );
}
