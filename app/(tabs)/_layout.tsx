import { Tabs } from 'expo-router';
import React from 'react';

// import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        tabBarStyle: { 
          display: 'none',
          height: 0,
          padding: 0,
          margin: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: 'transparent',
        tabBarInactiveTintColor: 'transparent',
      }}
      // tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="manifolder"
        options={{
          title: 'Manifold',
          
        }}
      />
      <Tabs.Screen
        name="declaration"
        options={{
          title: 'Declaration',
          
        }}
      />
      
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit',
          
        }}
      />
      <Tabs.Screen
        name="echantillon"
        options={{
          title: 'Echantillon',
         
        }}
      />
      <Tabs.Screen
        name="inventaire"
        options={{
          title: 'Inventaire',
        }}
      />
      <Tabs.Screen
        name="parametre"
        options={{
          title: 'Parametre',
        }}
      />
      <Tabs.Screen
        name="company"
        options={{
          title: 'Company',
          
        }}
      />
     
    </Tabs>
  );
}
