"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  imageUrl: string | null;
  progressPercentage: number;
  totalLessons: number;
  completedLessons: number;
  instructor: {
    name: string;
  };
}

interface DashboardData {
  courses: Course[];
  stats: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    certificatesEarned: number;
  };
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/student/dashboard");
      const responseData = await res.json();

      if (res.ok) {
        setData(responseData);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Erro ao carregar dados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Meu Aprendizado
        </h1>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total de Cursos</p>
            <p className="text-3xl font-bold text-blue-600">
              {data.stats.totalCourses}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Em Progresso</p>
            <p className="text-3xl font-bold text-yellow-600">
              {data.stats.inProgressCourses}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Concluídos</p>
            <p className="text-3xl font-bold text-green-600">
              {data.stats.completedCourses}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Certificados</p>
            <p className="text-3xl font-bold text-purple-600">
              {data.stats.certificatesEarned}
            </p>
          </div>
        </div>

        {/* Cursos */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Meus Cursos</h2>
          </div>
          <div className="p-6">
            {data.courses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  Você ainda não está matriculado em nenhum curso
                </p>
                <Link
                  href="/courses"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Explorar Cursos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/student/courses/${course.id}`}
                    className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-shadow overflow-hidden"
                  >
                    <div className="aspect-video bg-gray-200">
                      {course.imageUrl && (
                        <img
                          src={course.imageUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-1 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {course.instructor.name}
                      </p>

                      <div className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progresso</span>
                          <span className="font-semibold">
                            {course.progressPercentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${course.progressPercentage}%`,
                            }}
                          />
                        </div>
                      </div>

                      <p className="text-sm text-gray-500">
                        {course.completedLessons} de {course.totalLessons}{" "}
                        aulas concluídas
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
