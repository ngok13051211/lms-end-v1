import { db } from "./index";
import * as schema from "@shared/schema";
import { faker } from "@faker-js/faker/locale/vi";
import bcrypt from "bcrypt";

async function seed() {
  try {
    console.log("Seeding database...");

    // Create admin user
    const adminPassword = await bcrypt.hash("admin123", 10);
    const [admin] = await db
      .insert(schema.users)
      .values({
        username: "admin",
        email: "admin@homitutor.vn",
        password: adminPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .onConflictDoNothing();

    // Create subjects
    const subjectsData = [
      { name: "Toán học", icon: "calculate", description: "Giảng dạy các chủ đề toán học từ cơ bản đến nâng cao" },
      { name: "Vật lý", icon: "science", description: "Khám phá các nguyên lý vật lý học qua lý thuyết và thực hành" },
      { name: "Hóa học", icon: "biotech", description: "Hiểu sâu về cấu trúc, tính chất và phản ứng của các chất" },
      { name: "Tiếng Anh", icon: "language", description: "Phát triển kỹ năng ngôn ngữ Anh từ giao tiếp đến học thuật" },
      { name: "Ngữ văn", icon: "menu_book", description: "Khám phá văn học Việt Nam và thế giới" },
      { name: "Địa lý", icon: "public", description: "Tìm hiểu về các đặc điểm tự nhiên và xã hội trên Trái Đất" },
      { name: "Lịch sử", icon: "history_edu", description: "Nghiên cứu các sự kiện lịch sử trong nước và quốc tế" },
      { name: "Tin học", icon: "computer", description: "Phát triển kỹ năng sử dụng máy tính và lập trình" },
    ];

    for (const subject of subjectsData) {
      await db
        .insert(schema.subjects)
        .values({
          name: subject.name,
          description: subject.description,
          icon: subject.icon,
          tutorCount: Math.floor(Math.random() * 200),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    // Create education levels
    const educationLevelsData = [
      { name: "Tiểu học", description: "Lớp 1 đến lớp 5" },
      { name: "THCS", description: "Lớp 6 đến lớp 9" },
      { name: "THPT", description: "Lớp 10 đến lớp 12" },
      { name: "Đại học", description: "Sinh viên đại học" },
      { name: "Người đi làm", description: "Người đã đi làm muốn học thêm" },
    ];

    for (const level of educationLevelsData) {
      await db
        .insert(schema.educationLevels)
        .values({
          name: level.name,
          description: level.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    // Fetch created subjects and education levels
    const subjects = await db.query.subjects.findMany();
    const educationLevels = await db.query.educationLevels.findMany();

    // Create testimonials
    const testimonials = [
      {
        name: "Chị Ngọc Anh",
        role: "Phụ huynh học sinh lớp 9",
        rating: 5,
        comment: "Con tôi tiến bộ rõ rệt sau 2 tháng học với gia sư Toán từ HomiTutor. Điểm số tăng từ 6 lên 8.5, và quan trọng hơn, cháu đã thực sự yêu thích môn Toán. Cảm ơn HomiTutor!",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=688&q=80"
      },
      {
        name: "Minh Quân",
        role: "Học sinh lớp 12",
        rating: 4,
        comment: "Cô Hà dạy tiếng Anh rất tận tâm và có phương pháp dễ hiểu. Tôi đã cải thiện khả năng giao tiếp tiếng Anh và đạt 7.5 IELTS sau 6 tháng học. Rất hài lòng với HomiTutor!",
        avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80"
      },
      {
        name: "Anh Tuấn Huy",
        role: "Phụ huynh học sinh lớp 5",
        rating: 5,
        comment: "Việc tìm gia sư trên HomiTutor rất dễ dàng và an toàn. Tôi đánh giá cao quy trình xét duyệt gia sư kỹ lưỡng. Con trai tôi thích học với thầy Hoàng và đã tiến bộ nhiều trong môn Toán.",
        avatar: "https://images.unsplash.com/photo-1597223557154-721c1cecc4b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1160&q=80"
      }
    ];

    for (const testimonial of testimonials) {
      await db
        .insert(schema.testimonials)
        .values({
          name: testimonial.name,
          role: testimonial.role,
          rating: testimonial.rating,
          comment: testimonial.comment,
          avatar: testimonial.avatar,
          is_featured: true,
          createdAt: new Date()
        })
        .onConflictDoNothing();
    }

    // Create sample users with tutors
    const tutorImages = [
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=688&q=80",
      "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1160&q=80",
      "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80"
    ];

    const tutorProfiles = [
      {
        bio: "Tôi là giáo viên Toán tại trường THPT có hơn 5 năm kinh nghiệm giảng dạy. Tôi đã giúp nhiều học sinh cải thiện điểm số và đạt kết quả cao trong các kỳ thi quan trọng. Phương pháp giảng dạy của tôi tập trung vào việc xây dựng nền tảng vững chắc và phát triển tư duy logic.",
        education: "Tốt nghiệp Đại học Sư phạm Hà Nội, chuyên ngành Toán",
        experience: "5 năm kinh nghiệm giảng dạy tại trường THPT và dạy kèm",
        hourlyRate: 150000,
        teachingMode: "online",
        rating: 4.9,
        totalReviews: 24,
        isFeatured: true,
        isVerified: true,
        firstName: "Nguyễn Thị",
        lastName: "Minh",
        avatar: tutorImages[0],
        subjectIndices: [0], // Toán học
        levelIndices: [1, 2] // THCS, THPT
      },
      {
        bio: "Tôi là sinh viên năm cuối Đại học Khoa học Tự nhiên, có niềm đam mê với vật lý và khoa học. Tôi đã có 3 năm kinh nghiệm dạy kèm và giúp học sinh hiểu sâu các khái niệm vật lý thông qua các ví dụ thực tế và thí nghiệm đơn giản.",
        education: "Sinh viên năm cuối Đại học Khoa học Tự nhiên, chuyên ngành Vật lý",
        experience: "3 năm kinh nghiệm dạy kèm vật lý cho học sinh THCS và THPT",
        hourlyRate: 120000,
        teachingMode: "offline",
        rating: 4.7,
        totalReviews: 18,
        isFeatured: false,
        isVerified: true,
        firstName: "Trần Văn",
        lastName: "Hoàng",
        avatar: tutorImages[1],
        subjectIndices: [1], // Vật lý
        levelIndices: [1] // THCS
      },
      {
        bio: "Tôi là giáo viên tiếng Anh với chứng chỉ IELTS 8.5 và 7 năm kinh nghiệm giảng dạy. Tôi đã giúp nhiều học sinh và người đi làm nâng cao khả năng tiếng Anh, đặc biệt là kỹ năng giao tiếp và luyện thi quốc tế như IELTS, TOEFL.",
        education: "Tốt nghiệp Đại học Hà Nội, chuyên ngành Ngôn ngữ Anh, IELTS 8.5",
        experience: "7 năm kinh nghiệm giảng dạy tiếng Anh cho mọi lứa tuổi",
        hourlyRate: 180000,
        teachingMode: "both",
        rating: 4.8,
        totalReviews: 32,
        isFeatured: true,
        isVerified: true,
        firstName: "Lê Thu",
        lastName: "Hà",
        avatar: tutorImages[2],
        subjectIndices: [3], // Tiếng Anh
        levelIndices: [0, 1, 2, 3, 4] // Tất cả các cấp
      }
    ];

    for (const profile of tutorProfiles) {
      // Create tutor user
      const password = await bcrypt.hash("password123", 10);
      const [user] = await db
        .insert(schema.users)
        .values({
          username: faker.internet.userName({ firstName: profile.firstName, lastName: profile.lastName }).toLowerCase(),
          email: faker.internet.email({ firstName: profile.firstName, lastName: profile.lastName }).toLowerCase(),
          password: password,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: "tutor",
          avatar: profile.avatar,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .onConflictDoNothing();

      if (user) {
        // Create tutor profile
        const [tutorProfile] = await db
          .insert(schema.tutorProfiles)
          .values({
            user_id: user.id,
            bio: profile.bio,
            education: profile.education,
            experience: profile.experience,
            hourly_rate: profile.hourlyRate,
            teaching_mode: profile.teachingMode,
            is_verified: profile.isVerified,
            is_featured: profile.isFeatured,
            rating: profile.rating.toString(),
            total_reviews: profile.totalReviews,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        // Add subjects to tutor
        for (const subjectIndex of profile.subjectIndices) {
          if (subjects[subjectIndex]) {
            await db
              .insert(schema.tutorSubjects)
              .values({
                tutor_id: tutorProfile.id,
                subject_id: subjects[subjectIndex].id,
                created_at: new Date(),
              })
              .onConflictDoNothing();
          }
        }

        // Add education levels to tutor
        for (const levelIndex of profile.levelIndices) {
          if (educationLevels[levelIndex]) {
            await db
              .insert(schema.tutorEducationLevels)
              .values({
                tutor_id: tutorProfile.id,
                level_id: educationLevels[levelIndex].id,
                created_at: new Date(),
              })
              .onConflictDoNothing();
          }
        }

        // Create sample ads for each tutor
        if (subjects[profile.subjectIndices[0]] && educationLevels[profile.levelIndices[0]]) {
          await db
            .insert(schema.ads)
            .values({
              tutorId: tutorProfile.id,
              title: `Dạy ${subjects[profile.subjectIndices[0]].name} cho học sinh ${educationLevels[profile.levelIndices[0]].name}`,
              description: `Tôi cung cấp các buổi học ${subjects[profile.subjectIndices[0]].name} chất lượng cao dành cho học sinh ${educationLevels[profile.levelIndices[0]].name}. Phương pháp giảng dạy tập trung vào xây dựng nền tảng vững chắc và giải quyết bài tập thực tế.`,
              subjectId: subjects[profile.subjectIndices[0]].id,
              levelId: educationLevels[profile.levelIndices[0]].id,
              hourlyRate: profile.hourlyRate,
              teachingMode: profile.teachingMode,
              status: "active",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .onConflictDoNothing();
        }
      }
    }

    // Create sample student users
    for (let i = 0; i < 5; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const password = await bcrypt.hash("password123", 10);
      
      await db
        .insert(schema.users)
        .values({
          username: faker.internet.userName({ firstName, lastName }).toLowerCase(),
          email: faker.internet.email({ firstName, lastName }).toLowerCase(),
          password: password,
          firstName,
          lastName,
          role: "student",
          avatar: faker.image.avatar(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
