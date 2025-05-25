// seed.ts
import { db } from "./index";
import * as schema from "@shared/schema";
import bcrypt from "bcrypt";
import { eq, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    // Create a common password hash for all users
    const passwordHash = await bcrypt.hash("123123", 10);

    // Admin
    let [admin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, "admin@homitutor.vn"));
    if (!admin) {
      [admin] = await db
        .insert(schema.users)
        .values({
          username: "admin",
          email: "admin@homitutor.vn",
          password: await bcrypt.hash("admin123", 10),
          first_name: "Quản",
          last_name: "Trị Viên",
          role: "admin",
          is_verified: true,
          is_active: true,
          avatar: "",
          phone: "0987654321",
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
    }

    // ======= INSERT USERS =======
    // Create 10 tutors and 10 students with realistic Vietnamese information
    const tutors = [
      {
        username: "nguyenthanhminh",
        email: "nguyenthanhminh@gmail.com",
        password: passwordHash,
        first_name: "Minh",
        last_name: "Nguyễn Thanh",
        role: "tutor",
        date_of_birth: new Date("1990-05-15").toISOString(),
        address: "123 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        phone: "0901234567",
        avatar: "https://randomuser.me/api/portraits/men/1.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "phamthihuong",
        email: "phamthihuong@gmail.com",
        password: passwordHash,
        first_name: "Hương",
        last_name: "Phạm Thị",
        role: "tutor",
        date_of_birth: new Date("1988-09-23").toISOString(),
        address: "45 Nguyễn Huệ, Quận 3, TP. Hồ Chí Minh",
        phone: "0912345678",
        avatar: "https://randomuser.me/api/portraits/women/2.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranthiha",
        email: "tranthiha@gmail.com",
        password: passwordHash,
        first_name: "Hà",
        last_name: "Trần Thị",
        role: "tutor",
        date_of_birth: new Date("1992-03-12").toISOString(),
        address: "78 Đồng Khởi, Quận 1, TP. Hồ Chí Minh",
        phone: "0923456789",
        avatar: "https://randomuser.me/api/portraits/women/3.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "levantrung",
        email: "levantrung@gmail.com",
        password: passwordHash,
        first_name: "Trung",
        last_name: "Lê Văn",
        role: "tutor",
        date_of_birth: new Date("1985-11-07").toISOString(),
        address: "234 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh",
        phone: "0934567890",
        avatar: "https://randomuser.me/api/portraits/men/4.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "vuthihien",
        email: "vuthihien@gmail.com",
        password: passwordHash,
        first_name: "Hiền",
        last_name: "Vũ Thị",
        role: "tutor",
        date_of_birth: new Date("1991-04-25").toISOString(),
        address: "56 Lý Tự Trọng, Quận 1, TP. Hồ Chí Minh",
        phone: "0945678901",
        avatar: "https://randomuser.me/api/portraits/women/5.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "nguyenvanhai",
        email: "nguyenvanhai@gmail.com",
        password: passwordHash,
        first_name: "Hải",
        last_name: "Nguyễn Văn",
        role: "tutor",
        date_of_birth: new Date("1989-07-30").toISOString(),
        address: "102 Điện Biên Phủ, Quận Bình Thạnh, TP. Hồ Chí Minh",
        phone: "0956789012",
        avatar: "https://randomuser.me/api/portraits/men/6.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "hoangthilan",
        email: "hoangthilan@gmail.com",
        password: passwordHash,
        first_name: "Lan",
        last_name: "Hoàng Thị",
        role: "tutor",
        date_of_birth: new Date("1993-02-14").toISOString(),
        address: "75 Trần Hưng Đạo, Quận 1, TP. Hồ Chí Minh",
        phone: "0967890123",
        avatar: "https://randomuser.me/api/portraits/women/7.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranvanduc",
        email: "tranvanduc@gmail.com",
        password: passwordHash,
        first_name: "Đức",
        last_name: "Trần Văn",
        role: "tutor",
        date_of_birth: new Date("1987-10-05").toISOString(),
        address: "321 Võ Văn Ngân, Quận Thủ Đức, TP. Hồ Chí Minh",
        phone: "0978901234",
        avatar: "https://randomuser.me/api/portraits/men/8.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "phamthithanh",
        email: "phamthithanh@gmail.com",
        password: passwordHash,
        first_name: "Thanh",
        last_name: "Phạm Thị",
        role: "tutor",
        date_of_birth: new Date("1994-06-18").toISOString(),
        address: "189 Cách Mạng Tháng 8, Quận 3, TP. Hồ Chí Minh",
        phone: "0989012345",
        avatar: "https://randomuser.me/api/portraits/women/9.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "dangvantuan",
        email: "dangvantuan@gmail.com",
        password: passwordHash,
        first_name: "Tuấn",
        last_name: "Đặng Văn",
        role: "tutor",
        date_of_birth: new Date("1986-12-22").toISOString(),
        address: "67 Phạm Ngọc Thạch, Quận 3, TP. Hồ Chí Minh",
        phone: "0990123456",
        avatar: "https://randomuser.me/api/portraits/men/10.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const students = [
      {
        username: "nguyenthinguyen",
        email: "nguyenthinguyen@gmail.com",
        password: passwordHash,
        first_name: "Nguyên",
        last_name: "Nguyễn Thị",
        role: "student",
        date_of_birth: new Date("2000-02-10").toISOString(),
        address: "45 Trần Phú, Quận 5, TP. Hồ Chí Minh",
        phone: "0801234567",
        avatar: "https://randomuser.me/api/portraits/women/11.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranvanbinh",
        email: "tranvanbinh@gmail.com",
        password: passwordHash,
        first_name: "Bình",
        last_name: "Trần Văn",
        role: "student",
        date_of_birth: new Date("1998-08-15").toISOString(),
        address: "123 Bà Hạt, Quận 10, TP. Hồ Chí Minh",
        phone: "0812345678",
        avatar: "https://randomuser.me/api/portraits/men/12.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "levanthanh",
        email: "levanthanh@gmail.com",
        password: passwordHash,
        first_name: "Thành",
        last_name: "Lê Văn",
        role: "student",
        date_of_birth: new Date("1999-04-20").toISOString(),
        address: "56 Lê Văn Sỹ, Quận Phú Nhuận, TP. Hồ Chí Minh",
        phone: "0823456789",
        avatar: "https://randomuser.me/api/portraits/men/13.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "vothihong",
        email: "vothihong@gmail.com",
        password: passwordHash,
        first_name: "Hồng",
        last_name: "Võ Thị",
        role: "student",
        date_of_birth: new Date("2001-07-05").toISOString(),
        address: "234 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh",
        phone: "0834567890",
        avatar: "https://randomuser.me/api/portraits/women/14.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "nguyenminhquang",
        email: "nguyenminhquang@gmail.com",
        password: passwordHash,
        first_name: "Quang",
        last_name: "Nguyễn Minh",
        role: "student",
        date_of_birth: new Date("2002-11-30").toISOString(),
        address: "78 Đinh Tiên Hoàng, Quận 1, TP. Hồ Chí Minh",
        phone: "0845678901",
        avatar: "https://randomuser.me/api/portraits/men/15.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "tranthihue",
        email: "tranthihue@gmail.com",
        password: passwordHash,
        first_name: "Huệ",
        last_name: "Trần Thị",
        role: "student",
        date_of_birth: new Date("2000-09-12").toISOString(),
        address: "90 Bà Triệu, Quận 1, TP. Hồ Chí Minh",
        phone: "0856789012",
        avatar: "https://randomuser.me/api/portraits/women/16.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "phamvanthanh",
        email: "phamvanthanh@gmail.com",
        password: passwordHash,
        first_name: "Thành",
        last_name: "Phạm Văn",
        role: "student",
        date_of_birth: new Date("1997-03-25").toISOString(),
        address: "123 Lý Thường Kiệt, Quận 10, TP. Hồ Chí Minh",
        phone: "0867890123",
        avatar: "https://randomuser.me/api/portraits/men/17.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "hoangthuhuong",
        email: "hoangthuhuong@gmail.com",
        password: passwordHash,
        first_name: "Hương",
        last_name: "Hoàng Thu",
        role: "student",
        date_of_birth: new Date("1999-01-15").toISOString(),
        address: "45 Hai Bà Trưng, Quận 1, TP. Hồ Chí Minh",
        phone: "0878901234",
        avatar: "https://randomuser.me/api/portraits/women/18.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "lethihoa",
        email: "lethihoa@gmail.com",
        password: passwordHash,
        first_name: "Hoa",
        last_name: "Lê Thị",
        role: "student",
        date_of_birth: new Date("2002-05-20").toISOString(),
        address: "67 Phan Đình Phùng, Quận Phú Nhuận, TP. Hồ Chí Minh",
        phone: "0889012345",
        avatar: "https://randomuser.me/api/portraits/women/19.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        username: "nguyenduchuy",
        email: "nguyenduchuy@gmail.com",
        password: passwordHash,
        first_name: "Huy",
        last_name: "Nguyễn Đức",
        role: "student",
        date_of_birth: new Date("2001-10-10").toISOString(),
        address: "34 Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
        phone: "0890123456",
        avatar: "https://randomuser.me/api/portraits/men/20.jpg",
        is_verified: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]; // Check for existing users first to avoid duplicates
    const allUserEmails = [...tutors, ...students].map((user) => user.email);
    const existingUsers =
      allUserEmails.length > 0
        ? await db
            .select({ email: schema.users.email })
            .from(schema.users)
            .where(inArray(schema.users.email, allUserEmails))
        : [];

    const existingEmails = new Set(existingUsers.map((user) => user.email));

    // Filter out any users that already exist in the database
    const newTutors = tutors.filter(
      (tutor) => !existingEmails.has(tutor.email)
    );
    const newStudents = students.filter(
      (student) => !existingEmails.has(student.email)
    );
    // Combine the filtered arrays
    const usersToInsert = [...newTutors, ...newStudents]; // Map through your users and convert dates properly according to schema expectations
    const usersWithProperDates = usersToInsert.map((user) => {
      // Create a base user object with the date fields converted
      const userWithDates = {
        ...user,
        created_at: new Date(user.created_at), // Convert string to Date object
        updated_at: new Date(user.updated_at), // Convert string to Date object
      };

      // Handle date_of_birth specially based on its expected type in the schema
      if (user.date_of_birth) {
        // In the schema, date_of_birth is a text field, so we keep it as string
        userWithDates.date_of_birth = user.date_of_birth; // Keep as string since schema expects text type
      }

      return userWithDates;
    });

    // Use the converted array for insertion
    const insertedUsers =
      usersWithProperDates.length > 0
        ? await db.insert(schema.users).values(usersWithProperDates).returning({
            id: schema.users.id,
            email: schema.users.email,
            role: schema.users.role,
          })
        : [];

    console.log(
      `✅ Inserted ${insertedUsers.length} users. ${existingEmails.size} users already existed.`
    );

    // ======= INSERT SUBJECTS =======
    const subjects = [
      // Các môn cơ bản (cho mọi cấp học)
      {
        name: "Toán học",
        icon: "calculate",
        description:
          "Phát triển tư duy logic và kỹ năng giải quyết vấn đề qua các bài toán từ cơ bản đến nâng cao",
      },
      {
        name: "Tiếng Anh",
        icon: "language",
        description:
          "Nâng cao 4 kỹ năng nghe, nói, đọc, viết và chuẩn bị cho các kỳ thi quốc tế IELTS, TOEFL",
      },
      {
        name: "Ngữ văn",
        icon: "book_open",
        description:
          "Rèn luyện kỹ năng phân tích, cảm thụ văn học và phát triển tư duy phản biện",
      },

      // Môn khoa học tự nhiên
      {
        name: "Vật lý",
        icon: "bolt",
        description:
          "Khám phá các quy luật vận động của vật chất và ứng dụng vào thực tiễn cuộc sống",
      },
      {
        name: "Hóa học",
        icon: "science",
        description:
          "Tìm hiểu về cấu trúc, tính chất của vật chất và các phản ứng hóa học thông qua thí nghiệm",
      },
      {
        name: "Sinh học",
        icon: "biotech",
        description:
          "Khám phá thế giới sống từ cấp độ phân tử đến hệ sinh thái và ứng dụng trong y học, nông nghiệp",
      },

      // Môn khoa học xã hội
      {
        name: "Lịch sử",
        icon: "history",
        description:
          "Tìm hiểu về quá khứ để hiểu rõ hơn về hiện tại và định hướng tương lai",
      },
      {
        name: "Địa lý",
        icon: "public",
        description:
          "Khám phá thế giới tự nhiên và xã hội, mối quan hệ giữa con người với môi trường",
      },

      // Các môn năng khiếu
      {
        name: "Âm nhạc",
        icon: "music_note",
        description:
          "Phát triển năng khiếu âm nhạc qua việc học nhạc cụ, thanh nhạc và lý thuyết âm nhạc",
      },

      // Môn công nghệ
      {
        name: "Tin học",
        icon: "computer",
        description:
          "Làm quen với máy tính, học các phần mềm cơ bản và ngôn ngữ lập trình cho mọi lứa tuổi",
      },

      // Dành cho sinh viên đại học
      {
        name: "Kỹ năng mềm",
        icon: "psychology",
        description:
          "Phát triển kỹ năng giao tiếp, làm việc nhóm, quản lý thời gian và tư duy phản biện",
      },
    ];

    // Insert subjects and record their IDs for later association
    const insertedSubjectsMap = new Map();
    for (const sub of subjects) {
      // Add the created_at and updated_at fields to the subject data
      const subjectData = {
        ...sub,
        created_at: new Date(), // Use Date object directly, not string
        updated_at: new Date(), // Use Date object directly, not string
      };

      try {
        // Try to insert the subject
        const [insertedSub] = await db
          .insert(schema.subjects)
          .values(subjectData)
          .onConflictDoNothing()
          .returning();

        if (insertedSub) {
          insertedSubjectsMap.set(insertedSub.name, insertedSub.id);
        } else {
          // If not inserted (already exists), get the existing subject ID
          const [existingSub] = await db
            .select()
            .from(schema.subjects)
            .where(eq(schema.subjects.name, sub.name));

          if (existingSub) {
            insertedSubjectsMap.set(existingSub.name, existingSub.id);
          }
        }
      } catch (error) {
        console.error(`Error inserting subject ${sub.name}:`, error);
      }
    }

    // ======= INSERT EDUCATION LEVELS =======
    const levels = [
      {
        name: "Tiểu học",
        description:
          "Hỗ trợ nền tảng học tập vững chắc cho các em học sinh 6-11 tuổi",
      },
      {
        name: "THCS",
        description:
          "Đồng hành cùng học sinh 11-15 tuổi vượt qua thử thách của bậc trung học cơ sở",
      },
      {
        name: "THPT",
        description:
          "Chuẩn bị kiến thức và kỹ năng cho kỳ thi quan trọng của học sinh 15-18 tuổi",
      },
      {
        name: "Đại học",
        description:
          "Hỗ trợ sinh viên trong các môn học chuyên ngành và nâng cao kiến thức học thuật",
      },
      {
        name: "Năng khiếu",
        description:
          "Phát triển tài năng và đam mê trong các lĩnh vực nghệ thuật, thể thao và công nghệ",
      },
    ]; // Insert education levels and record their IDs for later association
    const insertedLevelsMap = new Map();
    for (const level of levels) {
      const currentDate = new Date();
      // Add the created_at and updated_at fields to the level data
      const levelData = {
        ...level,
        created_at: currentDate, // Use Date object directly, not string
        updated_at: currentDate, // Use Date object directly, not string
      };

      try {
        // Try to insert the education level
        const [insertedLevel] = await db
          .insert(schema.educationLevels)
          .values(levelData)
          .onConflictDoNothing()
          .returning();

        if (insertedLevel) {
          insertedLevelsMap.set(insertedLevel.name, insertedLevel.id);
        } else {
          // If not inserted (already exists), get the existing level ID
          const [existingLevel] = await db
            .select()
            .from(schema.educationLevels)
            .where(eq(schema.educationLevels.name, level.name));

          if (existingLevel) {
            insertedLevelsMap.set(existingLevel.name, existingLevel.id);
          }
        }
      } catch (error) {
        console.error(`Error inserting education level ${level.name}:`, error);
      }
    }

    // ======= ASSOCIATE SUBJECTS WITH EDUCATION LEVELS =======
    // Define which subjects are applicable to which education levels
    const subjectLevelAssociations = [
      // Các môn cơ bản - Tất cả các cấp học
      {
        subjectName: "Toán học",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Tiếng Anh",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Ngữ văn",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },

      // Khoa học tự nhiên - Từ THCS trở lên
      { subjectName: "Vật lý", levels: ["THCS", "THPT", "Đại học"] },
      { subjectName: "Hóa học", levels: ["THCS", "THPT", "Đại học"] },
      { subjectName: "Sinh học", levels: ["THCS", "THPT", "Đại học"] },

      // Khoa học xã hội
      {
        subjectName: "Lịch sử",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },
      {
        subjectName: "Địa lý",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },

      // Các môn năng khiếu
      {
        subjectName: "Âm nhạc",
        levels: ["Tiểu học", "THCS", "THPT", "Năng khiếu"],
      },

      // Môn công nghệ
      {
        subjectName: "Tin học",
        levels: ["Tiểu học", "THCS", "THPT", "Đại học"],
      },

      // Dành cho sinh viên đại học
      { subjectName: "Kỹ năng mềm", levels: ["THPT", "Đại học"] },
    ];

    // Create subject-level associations in the database
    for (const assoc of subjectLevelAssociations) {
      const subjectId = insertedSubjectsMap.get(assoc.subjectName);

      if (!subjectId) {
        console.warn(
          `Subject "${assoc.subjectName}" not found. Skipping associations.`
        );
        continue;
      }

      for (const levelName of assoc.levels) {
        const levelId = insertedLevelsMap.get(levelName);

        if (!levelId) {
          console.warn(
            `Education level "${levelName}" not found. Skipping association.`
          );
          continue;
        }

        try {
          // Insert subject-education level association
          await db
            .insert(schema.subjectEducationLevels)
            .values({
              subject_id: subjectId,
              level_id: levelId,
              created_at: new Date(), // Use Date object directly, not string
            })
            .onConflictDoNothing();
        } catch (error) {
          console.error(
            `Error associating subject ${assoc.subjectName} with level ${levelName}:`,
            error
          );
        }
      }
    }
    console.log("✅ Database seeding completed successfully!");

    // ======= CREATE TUTOR PROFILES =======
    // Get all inserted tutors
    const allTutors = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "tutor"));

    if (allTutors.length === 0) {
      console.warn("No tutors found to create profiles for");
      return;
    }

    // Define tutor profile data with realistic Vietnamese information
    const tutorProfilesData = [
      {
        // Nguyễn Thanh Minh - Toán học
        email: "nguyenthanhminh@gmail.com",
        bio: "Tôi là giáo viên Toán với 8 năm kinh nghiệm giảng dạy tại các trường THPT và trung tâm gia sư. Chuyên môn về Đại số, Hình học và Giải tích. Đã giúp hơn 200 học sinh cải thiện điểm số và đạt kết quả cao trong các kỳ thi.",
        availability: "Thứ 2-6: 18:00-22:00, Thứ 7-CN: 8:00-20:00",
        subjects: ["Toán học"],
        levels: ["THCS", "THPT", "Đại học"],
      },
      {
        // Phạm Thị Hương - Tiếng Anh
        email: "phamthihuong@gmail.com",
        bio: "Giảng viên Tiếng Anh với 10 năm kinh nghiệm, có bằng IELTS 8.0 và đã từng học tập tại Úc. Chuyên luyện thi IELTS, TOEFL và Tiếng Anh giao tiếp. Phương pháp giảng dạy tương tác, sinh động.",
        availability: "Thứ 2-7: 6:00-8:00, 19:00-22:00",
        subjects: ["Tiếng Anh"],
        levels: ["THCS", "THPT", "Đại học"],
      },
      {
        // Trần Thị Hà - Ngữ văn
        email: "tranthiha@gmail.com",
        bio: "Cô giáo Ngữ văn đam mê với 6 năm kinh nghiệm giảng dạy. Chuyên phân tích tác phẩm văn học, luyện viết và kỹ năng thuyết trình. Đã giúp nhiều học sinh đạt điểm cao trong kỳ thi THPT Quốc gia.",
        availability: "Thứ 3-7: 18:30-21:30",
        subjects: ["Ngữ văn"],
        levels: ["THCS", "THPT"],
      },
      {
        // Lê Văn Trung - Vật lý
        email: "levantrung@gmail.com",
        bio: "Thạc sĩ Vật lý với 12 năm kinh nghiệm giảng dạy từ THCS đến Đại học. Chuyên môn về Cơ học, Điện học và Quang học. Có phương pháp giảng dạy độc đáo kết hợp lý thuyết với thí nghiệm thực tế.",
        availability: "Thứ 2-6: 19:00-22:00, CN: 14:00-18:00",
        subjects: ["Vật lý"],
        levels: ["THCS", "THPT", "Đại học"],
      },
      {
        // Vũ Thị Hiền - Hóa học
        email: "vuthihien@gmail.com",
        bio: "Cử nhân Hóa học với 7 năm kinh nghiệm, chuyên luyện thi THPT và hỗ trợ sinh viên Đại học. Đam mê thí nghiệm hóa học và có khả năng giải thích phức tạp thành đơn giản, dễ hiểu.",
        availability: "Thứ 2-5: 18:00-21:00, Thứ 7: 9:00-17:00",
        subjects: ["Hóa học"],
        levels: ["THCS", "THPT", "Đại học"],
      },
      {
        // Nguyễn Văn Hải - Sinh học
        email: "nguyenvanhai@gmail.com",
        bio: "Thạc sĩ Sinh học với 9 năm kinh nghiệm, chuyên về Sinh học phân tử và Di truyền học. Đã hướng dẫn nhiều học sinh đạt giải trong các kỳ thi HSG Sinh học cấp tỉnh và quốc gia.",
        availability: "Thứ 3-6: 18:30-21:30, CN: 8:00-12:00",
        subjects: ["Sinh học"],
        levels: ["THCS", "THPT", "Đại học"],
      },
      {
        // Hoàng Thị Lan - Lịch sử
        email: "hoangthilan@gmail.com",
        bio: "Cử nhân Lịch sử với 5 năm kinh nghiệm giảng dạy. Đam mê nghiên cứu lịch sử Việt Nam và thế giới. Có khả năng kể chuyện lịch sử một cách sinh động, thu hút học sinh.",
        availability: "Thứ 2-4-6: 19:00-22:00, Thứ 7: 14:00-18:00",
        subjects: ["Lịch sử"],
        levels: ["THCS", "THPT"],
      },
      {
        // Trần Văn Đức - Địa lý
        email: "tranvanduc@gmail.com",
        bio: "Thạc sĩ Địa lý với 11 năm kinh nghiệm, chuyên về Địa lý tự nhiên và Địa lý kinh tế. Đã tham gia nhiều dự án nghiên cứu thực địa và có kiến thức sâu rộng về địa lý Việt Nam và thế giới.",
        availability: "Thứ 2-3-5: 18:00-21:00, CN: 9:00-15:00",
        subjects: ["Địa lý"],
        levels: ["THCS", "THPT", "Đại học"],
      },
      {
        // Phạm Thị Thanh - Âm nhạc
        email: "phamthithanh@gmail.com",
        bio: "Giảng viên Âm nhạc với 4 năm kinh nghiệm, chuyên piano và thanh nhạc. Tốt nghiệp Nhạc viện TP.HCM, đã tham gia nhiều chương trình biểu diễn và có phương pháp giảng dạy phù hợp với mọi lứa tuổi.",
        availability: "Thứ 2-7: 14:00-20:00",
        subjects: ["Âm nhạc"],
        levels: ["Tiểu học", "THCS", "THPT", "Năng khiếu"],
      },
      {
        // Đặng Văn Tuấn - Tin học
        email: "dangvantuan@gmail.com",
        bio: "Kỹ sư Phần mềm với 13 năm kinh nghiệm trong ngành IT và 5 năm giảng dạy. Chuyên về lập trình Python, Java, Web Development và AI. Đã đào tạo nhiều học sinh đạt giải Olympic Tin học.",
        availability: "Thứ 2-4-6: 19:00-22:00, CN: 8:00-17:00",
        subjects: ["Tin học"],
        levels: ["THCS", "THPT", "Đại học"],
      },
    ];

    // Create tutor profiles
    for (
      let i = 0;
      i < Math.min(tutorProfilesData.length, allTutors.length);
      i++
    ) {
      const tutor = allTutors[i];
      const profileData = tutorProfilesData[i];

      try {
        // Check if profile already exists
        const [existingProfile] = await db
          .select()
          .from(schema.tutorProfiles)
          .where(eq(schema.tutorProfiles.user_id, tutor.id));

        if (existingProfile) {
          console.log(
            `Profile for tutor ${tutor.email} already exists, skipping...`
          );
          continue;
        }

        // Create the tutor profile - chỉ sử dụng các trường có trong schema
        const [insertedProfile] = await db
          .insert(schema.tutorProfiles)
          .values({
            user_id: tutor.id,
            bio: profileData.bio,
            availability: profileData.availability,
            is_verified: false,
            is_featured: false,
            rating: "0.0",
            total_reviews: 0,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        console.log(`✅ Created profile for tutor: ${tutor.email}`);

        // Associate tutor with subjects and levels
        for (const subjectName of profileData.subjects) {
          const subjectId = insertedSubjectsMap.get(subjectName);

          if (subjectId) {
            // Insert into tutorSubjects table
            try {
              await db
                .insert(schema.tutorSubjects)
                .values({
                  tutor_id: insertedProfile.id,
                  subject_id: subjectId,
                  created_at: new Date(),
                })
                .onConflictDoNothing();
            } catch (error) {
              console.error(
                `Error associating tutor ${tutor.email} with subject ${subjectName}:`,
                error
              );
            }

            // Insert into tutorEducationLevels table for each level
            for (const levelName of profileData.levels) {
              const levelId = insertedLevelsMap.get(levelName);

              if (levelId) {
                try {
                  await db
                    .insert(schema.tutorEducationLevels)
                    .values({
                      tutor_id: insertedProfile.id,
                      level_id: levelId,
                      created_at: new Date(),
                    })
                    .onConflictDoNothing();
                } catch (error) {
                  console.error(
                    `Error associating tutor ${tutor.email} with level ${levelName}:`,
                    error
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(
          `Error creating profile for tutor ${tutor.email}:`,
          error
        );
      }
    }

    console.log("✅ Tutor profiles creation completed!");

    // ======= CREATE TEACHING REQUESTS =======
    // Get all tutor profiles that were created
    const allTutorProfiles = await db
      .select({
        id: schema.tutorProfiles.id,
        userId: schema.tutorProfiles.user_id,
      })
      .from(schema.tutorProfiles)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.tutorProfiles.user_id)
      );

    if (allTutorProfiles.length === 0) {
      console.warn("No tutor profiles found to create teaching requests for");
      return;
    }

    // Define teaching request data for each tutor
    const teachingRequestsData = [
      {
        // Nguyễn Thanh Minh - Toán học
        tutorEmail: "nguyenthanhminh@gmail.com",
        requests: [
          {
            subject: "Toán học",
            level: "THCS",
            introduction:
              "Tôi chuyên giảng dạy Toán THCS với phương pháp dễ hiểu, giúp học sinh nắm vững kiến thức cơ bản và phát triển tư duy logic. Có kinh nghiệm 8 năm trong việc hỗ trợ học sinh yếu kém trở nên tự tin với môn Toán.",
            experience:
              "8 năm giảng dạy Toán THCS tại các trường công lập và trung tâm gia sư. Đã giúp hơn 150 học sinh cải thiện điểm số từ 3-4 lên 7-8 điểm. Chuyên môn: Đại số cơ bản, Hình học phẳng, Toán ứng dụng.",
            certifications:
              '["Chứng chỉ Giảng viên Toán học", "Bằng Cử nhân Toán học - Đại học Sư phạm TP.HCM", "Chứng chỉ Phương pháp giảng dạy hiện đại"]',
          },
          {
            subject: "Toán học",
            level: "THPT",
            introduction:
              "Tôi có nhiều năm kinh nghiệm luyện thi THPT Quốc gia môn Toán, đặc biệt mạnh về Giải tích và Hình học không gian. Phương pháp giảng dạy tập trung vào việc hiểu bản chất bài toán và áp dụng linh hoạt.",
            experience:
              "5 năm chuyên luyện thi THPT Quốc gia. Học sinh của tôi thường đạt điểm 8-9 trong kỳ thi. Chuyên sâu: Hàm số, Tích phân, Hình học không gian, Xác suất thống kê.",
            certifications:
              '["Chứng chỉ Luyện thi THPT Quốc gia", "Bằng Thạc sĩ Toán ứng dụng"]',
          },
        ],
      },
      {
        // Phạm Thị Hương - Tiếng Anh
        tutorEmail: "phamthihuong@gmail.com",
        requests: [
          {
            subject: "Tiếng Anh",
            level: "THCS",
            introduction:
              "Tôi giảng dạy Tiếng Anh THCS với phương pháp giao tiếp tự nhiên, giúp học sinh không chỉ học được ngữ pháp mà còn tự tin sử dụng tiếng Anh trong giao tiếp hàng ngày.",
            experience:
              "10 năm giảng dạy Tiếng Anh từ cơ bản đến nâng cao. Đã giúp nhiều học sinh THCS đạt điểm cao trong các kỳ thi và tự tin giao tiếp bằng tiếng Anh.",
            certifications:
              '["IELTS 8.0", "TESOL Certificate", "Bằng Thạc sĩ Ngôn ngữ Anh"]',
          },
          {
            subject: "Tiếng Anh",
            level: "THPT",
            introduction:
              "Chuyên luyện thi THPT và các chứng chỉ quốc tế như IELTS, TOEFL. Phương pháp học kết hợp lý thuyết và thực hành, tập trung phát triển 4 kỹ năng nghe-nói-đọc-viết một cách cân bằng.",
            experience:
              "Có kinh nghiệm du học tại Úc 2 năm, hiểu rõ văn hóa và cách sử dụng tiếng Anh thực tế. Đã đào tạo hơn 200 học sinh đạt IELTS 6.5+ và điểm cao trong kỳ thi THPT.",
            certifications:
              '["IELTS 8.0", "Cambridge CELTA", "Chứng chỉ du học Úc"]',
          },
        ],
      },
      {
        // Trần Thị Hà - Ngữ văn
        tutorEmail: "tranthiha@gmail.com",
        requests: [
          {
            subject: "Ngữ văn",
            level: "THCS",
            introduction:
              "Tôi giúp học sinh THCS yêu thích môn Văn thông qua việc phân tích tác phẩm sinh động và rèn luyện kỹ năng viết sáng tạo. Mục tiêu là phát triển tư duy phản biện và khả năng diễn đạt của học sinh.",
            experience:
              "6 năm giảng dạy Ngữ văn THCS. Có phương pháp độc đáo trong việc giải thích các tác phẩm văn học, giúp học sinh dễ dàng hiểu và nhớ lâu.",
            certifications:
              '["Bằng Cử nhân Ngữ văn", "Chứng chỉ Phương pháp giảng dạy Văn học"]',
          },
          {
            subject: "Ngữ văn",
            level: "THPT",
            introduction:
              "Chuyên luyện thi THPT Quốc gia môn Văn với trọng tâm là phân tích văn bản và nghị luận xã hội. Giúp học sinh nắm vững cấu trúc bài thi và phát triển tư duy logic trong viết.",
            experience:
              "Đã hướng dẫn nhiều học sinh đạt điểm 8-9 trong kỳ thi THPT. Có kinh nghiệm biên soạn tài liệu ôn thi và đề thi thử.",
            certifications:
              '["Chứng chỉ Luyện thi THPT Quốc gia", "Chứng chỉ Biên soạn giáo trình"]',
          },
        ],
      },
      {
        // Lê Văn Trung - Vật lý
        tutorEmail: "levantrung@gmail.com",
        requests: [
          {
            subject: "Vật lý",
            level: "THCS",
            introduction:
              "Tôi giảng dạy Vật lý THCS với nhiều thí nghiệm minh họa, giúp học sinh hiểu bản chất của các hiện tượng vật lý thay vì chỉ học thuộc công thức.",
            experience:
              "12 năm giảng dạy Vật lý. Có bộ sưu tập thí nghiệm phong phú, giúp học sinh học Vật lý một cách trực quan và thú vị.",
            certifications:
              '["Bằng Thạc sĩ Vật lý", "Chứng chỉ An toàn thí nghiệm"]',
          },
          {
            subject: "Vật lý",
            level: "THPT",
            introduction:
              "Chuyên sâu về Cơ học, Điện học và Quang học. Phương pháp giảng dạy kết hợp lý thuyết với bài tập thực hành, giúp học sinh nắm vững kiến thức và tự tin làm bài thi.",
            experience:
              "Có kinh nghiệm nghiên cứu khoa học tại trường Đại học. Đã xuất bản nhiều bài báo khoa học và có phương pháp giảng dạy hiệu quả.",
            certifications:
              '["Bằng Tiến sĩ Vật lý", "Chứng chỉ Nghiên cứu khoa học"]',
          },
        ],
      },
      {
        // Vũ Thị Hiền - Hóa học
        tutorEmail: "vuthihien@gmail.com",
        requests: [
          {
            subject: "Hóa học",
            level: "THCS",
            introduction:
              "Tôi giúp học sinh THCS làm quen với Hóa học qua các thí nghiệm đơn giản và an toàn. Mục tiêu là tạo hứng thú học tập và hiểu được ứng dụng của Hóa học trong đời sống.",
            experience:
              "7 năm giảng dạy với nhiều thí nghiệm thú vị. Học sinh của tôi thường rất hào hứng với môn Hóa và hiểu sâu về bản chất các phản ứng.",
            certifications:
              '["Bằng Cử nhân Hóa học", "Chứng chỉ An toàn hóa chất"]',
          },
          {
            subject: "Hóa học",
            level: "THPT",
            introduction:
              "Chuyên luyện thi THPT và hỗ trợ học sinh ôn thi Đại học. Mạnh về Hóa vô cơ và Hóa hữu cơ, có khả năng giải thích các bài tập khó một cách dễ hiểu.",
            experience:
              "Có kinh nghiệm làm việc tại phòng thí nghiệm chuyên nghiệp, hiểu rõ về ứng dụng thực tế của Hóa học.",
            certifications:
              '["Bằng Thạc sĩ Hóa học", "Chứng chỉ Phân tích hóa học"]',
          },
        ],
      },
      {
        // Nguyễn Văn Hải - Sinh học
        tutorEmail: "nguyenvanhai@gmail.com",
        requests: [
          {
            subject: "Sinh học",
            level: "THPT",
            introduction:
              "Tôi chuyên giảng dạy Sinh học THPT với trọng tâm là Sinh học phân tử và Di truyền học. Có khả năng giải thích các quá trình sinh học phức tạp một cách dễ hiểu.",
            experience:
              "9 năm nghiên cứu và giảng dạy Sinh học. Đã hướng dẫn nhiều học sinh đạt giải cao trong các kỳ thi HSG và Olympic Sinh học.",
            certifications:
              '["Bằng Thạc sĩ Sinh học", "Chứng chỉ Nghiên cứu Di truyền học"]',
          },
          {
            subject: "Sinh học",
            level: "Đại học",
            introduction:
              "Chuyên sâu về Sinh học phân tử và Công nghệ sinh học. Giúp sinh viên nắm vững kiến thức chuyên ngành và định hướng nghiên cứu khoa học.",
            experience:
              "Có nhiều công trình nghiên cứu được công bố trên các tạp chí khoa học quốc tế. Kinh nghiệm hướng dẫn sinh viên làm luận văn tốt nghiệp.",
            certifications:
              '["Bằng Tiến sĩ Sinh học", "Chứng chỉ Công nghệ sinh học"]',
          },
        ],
      },
      {
        // Hoàng Thị Lan - Lịch sử
        tutorEmail: "hoangthilan@gmail.com",
        requests: [
          {
            subject: "Lịch sử",
            level: "THCS",
            introduction:
              "Tôi giảng dạy Lịch sử THCS với phương pháp kể chuyện sinh động, giúp học sinh dễ dàng ghi nhớ các sự kiện lịch sử và hiểu được ý nghĩa của chúng.",
            experience:
              "5 năm giảng dạy với phong cách truyền đạt hấp dẫn. Học sinh thường rất thích thú với các câu chuyện lịch sử và nhớ lâu kiến thức.",
            certifications:
              '["Bằng Cử nhân Lịch sử", "Chứng chỉ Hướng dẫn viên du lịch"]',
          },
          {
            subject: "Lịch sử",
            level: "THPT",
            introduction:
              "Chuyên luyện thi THPT môn Lịch sử với trọng tâm là lịch sử Việt Nam và thế giới hiện đại. Có phương pháp học hiệu quả giúp học sinh nhớ năm tháng và sự kiện.",
            experience:
              "Có kinh nghiệm tham gia các đoàn khảo sát di tích lịch sử, hiểu sâu về văn hóa và truyền thống Việt Nam.",
            certifications:
              '["Chứng chỉ Nghiên cứu Lịch sử Việt Nam", "Chứng chỉ Bảo tồn di sản"]',
          },
        ],
      },
      {
        // Trần Văn Đức - Địa lý
        tutorEmail: "tranvanduc@gmail.com",
        requests: [
          {
            subject: "Địa lý",
            level: "THCS",
            introduction:
              "Tôi giảng dạy Địa lý THCS với nhiều hình ảnh và bản đồ trực quan, giúp học sinh hiểu về các vùng miền và hiện tượng địa lý một cách sinh động.",
            experience:
              "11 năm giảng dạy với bộ sưu tập bản đồ và hình ảnh phong phú. Thường tổ chức các chuyến tham quan thực địa cho học sinh.",
            certifications: '["Bằng Thạc sĩ Địa lý", "Chứng chỉ GIS"]',
          },
          {
            subject: "Địa lý",
            level: "THPT",
            introduction:
              "Chuyên sâu về Địa lý tự nhiên và Địa lý kinh tế. Có kinh nghiệm nghiên cứu thực địa và ứng dụng công nghệ GIS trong giảng dạy.",
            experience:
              "Đã tham gia nhiều dự án nghiên cứu địa lý ứng dụng. Có khả năng kết hợp lý thuyết với thực tiễn một cách hiệu quả.",
            certifications:
              '["Bằng Tiến sĩ Địa lý", "Chứng chỉ Nghiên cứu thực địa"]',
          },
        ],
      },
      {
        // Phạm Thị Thanh - Âm nhạc
        tutorEmail: "phamthithanh@gmail.com",
        requests: [
          {
            subject: "Âm nhạc",
            level: "Tiểu học",
            introduction:
              "Tôi giảng dạy Âm nhạc cho trẻ em với phương pháp vui nhộn và dễ tiếp cận. Giúp các em làm quen với âm nhạc qua các trò chơi và bài hát thiếu nhi.",
            experience:
              "4 năm giảng dạy âm nhạc cho trẻ em. Có phương pháp độc đáo giúp trẻ phát triển khiếu âm nhạc một cách tự nhiên.",
            certifications:
              '["Bằng Cử nhân Âm nhạc", "Chứng chỉ Giảng dạy trẻ em"]',
          },
          {
            subject: "Âm nhạc",
            level: "Năng khiếu",
            introduction:
              "Chuyên đào tạo piano và thanh nhạc cho học viên có năng khiếu. Phương pháp giảng dạy chuyên nghiệp, giúp học viên phát triển kỹ thuật và cảm xúc âm nhạc.",
            experience:
              "Tốt nghiệp Nhạc viện TP.HCM với thành tích xuất sắc. Đã biểu diễn tại nhiều chương trình nghệ thuật chuyên nghiệp.",
            certifications:
              '["Bằng Xuất sắc Nhạc viện TP.HCM", "Chứng chỉ Piano cấp 8", "Chứng chỉ Thanh nhạc cổ điển"]',
          },
        ],
      },
      {
        // Đặng Văn Tuấn - Tin học
        tutorEmail: "dangvantuan@gmail.com",
        requests: [
          {
            subject: "Tin học",
            level: "THCS",
            introduction:
              "Tôi giảng dạy Tin học cơ bản cho học sinh THCS, từ làm quen với máy tính đến lập trình Scratch và Python đơn giản. Mục tiêu là tạo hứng thú và nền tảng cho tương lai.",
            experience:
              "13 năm trong ngành IT và 5 năm giảng dạy. Có khả năng truyền đạt kiến thức kỹ thuật một cách dễ hiểu cho học sinh.",
            certifications:
              '["Bằng Kỹ sư Khoa học Máy tính", "Chứng chỉ Giảng dạy Tin học"]',
          },
          {
            subject: "Tin học",
            level: "THPT",
            introduction:
              "Chuyên luyện thi Olympic Tin học và dạy lập trình nâng cao. Giúp học sinh nắm vững các thuật toán và cấu trúc dữ liệu, chuẩn bị tốt cho các kỳ thi và tương lai học đại học.",
            experience:
              "Đã đào tạo nhiều học sinh đạt giải cao trong Olympic Tin học quốc gia. Có kinh nghiệm thực tế trong phát triển phần mềm.",
            certifications:
              '["AWS Certified Developer", "Oracle Java Certified", "Chứng chỉ Huấn luyện Olympic Tin học"]',
          },
        ],
      },
    ];

    // Create teaching requests for each tutor
    for (const tutorData of teachingRequestsData) {
      // Find the tutor profile by email
      const tutorUser = await db
        .select({
          tutorProfileId: schema.tutorProfiles.id,
          email: schema.users.email,
        })
        .from(schema.tutorProfiles)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.tutorProfiles.user_id)
        )
        .where(eq(schema.users.email, tutorData.tutorEmail))
        .limit(1);

      if (tutorUser.length === 0) {
        console.warn(`Tutor with email ${tutorData.tutorEmail} not found`);
        continue;
      }

      const tutorProfileId = tutorUser[0].tutorProfileId;

      // Create requests for this tutor
      for (const requestData of tutorData.requests) {
        try {
          // Get subject and level IDs
          const subjectId = insertedSubjectsMap.get(requestData.subject);
          const levelId = insertedLevelsMap.get(requestData.level);

          if (!subjectId || !levelId) {
            console.warn(
              `Subject "${requestData.subject}" or level "${requestData.level}" not found for tutor ${tutorData.tutorEmail}`
            );
            continue;
          }

          // Check if teaching request already exists
          const [existingRequest] = await db
            .select()
            .from(schema.teachingRequests)
            .where(
              sql`${schema.teachingRequests.tutor_id} = ${tutorProfileId} 
                  AND ${schema.teachingRequests.subject_id} = ${subjectId} 
                  AND ${schema.teachingRequests.level_id} = ${levelId}`
            );

          if (existingRequest) {
            console.log(
              `Teaching request for ${tutorData.tutorEmail} - ${requestData.subject} (${requestData.level}) already exists, skipping...`
            );
            continue;
          }

          // Create the teaching request
          await db.insert(schema.teachingRequests).values({
            tutor_id: tutorProfileId,
            subject_id: subjectId,
            level_id: levelId,
            introduction: requestData.introduction,
            experience: requestData.experience,
            certifications: requestData.certifications,
            status: "approved", // Auto-approve for seed data
            approved_by: null, // Could be set to an admin user ID if available
            created_at: new Date(),
            updated_at: new Date(),
          });

          console.log(
            `✅ Created teaching request for ${tutorData.tutorEmail} - ${requestData.subject} (${requestData.level})`
          );
        } catch (error) {
          console.error(
            `Error creating teaching request for ${tutorData.tutorEmail} - ${requestData.subject}:`,
            error
          );
        }
      }
    }
    console.log("✅ Teaching requests creation completed!");

    // ======= CREATE COURSES =======
    console.log("🎓 Creating courses for tutors...");

    // Define comprehensive course data for each tutor
    const coursesData = [
      {
        // Nguyễn Thanh Minh - Toán học
        tutorEmail: "nguyenthanhminh@gmail.com",
        courses: [
          {
            subject: "Toán học",
            level: "THCS",
            title: "Toán THCS - Nền tảng vững chắc cho tương lai",
            description:
              "Khóa học Toán THCS toàn diện giúp học sinh nắm vững kiến thức cơ bản và phát triển tư duy logic. Chương trình bao gồm: Đại số cơ bản, Hình học phẳng, Số học và các bài tập ứng dụng thực tế. Phương pháp giảng dạy dễ hiểu, từng bước một, giúp học sinh tự tin với môn Toán.",
            hourly_rate: "180000.00",
            teaching_mode: "both",
          },
          {
            subject: "Toán học",
            level: "THPT",
            title: "Toán THPT - Chinh phục kỳ thi THPT Quốc gia",
            description:
              "Khóa học luyện thi THPT Quốc gia môn Toán với chương trình chuyên sâu. Tập trung vào: Hàm số và đồ thị, Tích phân và ứng dụng, Hình học không gian, Xác suất thống kê. Được thiết kế đặc biệt cho học sinh muốn đạt điểm cao 8-10 trong kỳ thi.",
            hourly_rate: "250000.00",
            teaching_mode: "both",
          },
        ],
      },
      {
        // Phạm Thị Hương - Tiếng Anh
        tutorEmail: "phamthihuong@gmail.com",
        courses: [
          {
            subject: "Tiếng Anh",
            level: "THCS",
            title: "Tiếng Anh THCS - Giao tiếp tự nhiên và tự tin",
            description:
              "Khóa học Tiếng Anh THCS tập trung phát triển 4 kỹ năng nghe-nói-đọc-viết một cách cân bằng. Chương trình bao gồm: Ngữ pháp cơ bản, Từ vựng theo chủ đề, Giao tiếp hàng ngày, Luyện phát âm chuẩn. Phương pháp học qua trò chơi và hoạt động tương tác.",
            hourly_rate: "160000.00",
            teaching_mode: "both",
          },
          {
            subject: "Tiếng Anh",
            level: "THPT",
            title: "Tiếng Anh THPT & IELTS - Đạt mục tiêu quốc tế",
            description:
              "Khóa học kết hợp luyện thi THPT và chuẩn bị IELTS. Nội dung: Ngữ pháp nâng cao, Từ vựng academic, Writing Task 1&2, Speaking tự nhiên, Reading comprehension. Mục tiêu: Điểm cao THPT + IELTS 6.5-8.0. Có kinh nghiệm du học Úc.",
            hourly_rate: "220000.00",
            teaching_mode: "both",
          },
        ],
      },
      {
        // Trần Thị Hà - Ngữ văn
        tutorEmail: "tranthiha@gmail.com",
        courses: [
          {
            subject: "Ngữ văn",
            level: "THCS",
            title: "Ngữ văn THCS - Yêu thích văn học Việt Nam",
            description:
              "Khóa học Ngữ văn THCS giúp học sinh hiểu sâu các tác phẩm văn học qua phân tích sinh động. Chương trình: Văn học dân gian, Thơ ca cổ điển, Truyện ngắn hiện đại, Kỹ năng viết văn miêu tả và tự sự. Phát triển tư duy sáng tạo và khả năng diễn đạt.",
            hourly_rate: "150000.00",
            teaching_mode: "both",
          },
          {
            subject: "Ngữ văn",
            level: "THPT",
            title: "Ngữ văn THPT - Luyện thi với phương pháp hiệu quả",
            description:
              "Khóa học luyện thi THPT Quốc gia môn Văn với trọng tâm phân tích văn bản và nghị luận xã hội. Nội dung: Kỹ thuật phân tích tác phẩm, Cấu trúc bài nghị luận, Lập luận logic, Phong cách viết ấn tượng. Mục tiêu đạt điểm 8-9 trong kỳ thi.",
            hourly_rate: "200000.00",
            teaching_mode: "both",
          },
        ],
      },
      {
        // Lê Văn Trung - Vật lý
        tutorEmail: "levantrung@gmail.com",
        courses: [
          {
            subject: "Vật lý",
            level: "THCS",
            title: "Vật lý THCS - Khám phá thế giới qua thí nghiệm",
            description:
              "Khóa học Vật lý THCS với nhiều thí nghiệm thú vị giúp học sinh hiểu bản chất các hiện tượng. Chương trình: Cơ học cơ bản, Nhiệt học, Điện học đơn giản, Quang học. Học qua thực hành và quan sát, không chỉ học thuộc công thức.",
            hourly_rate: "170000.00",
            teaching_mode: "both",
          },
          {
            subject: "Vật lý",
            level: "THPT",
            title: "Vật lý THPT - Chinh phục các bài tập khó",
            description:
              "Khóa học Vật lý THPT chuyên sâu với giảng viên có bằng Tiến sĩ. Nội dung: Cơ học nâng cao, Điện từ học, Dao động sóng, Vật lý hiện đại. Kết hợp lý thuyết với bài tập từ cơ bản đến nâng cao. Có kinh nghiệm nghiên cứu khoa học.",
            hourly_rate: "280000.00",
            teaching_mode: "both",
          },
        ],
      },
      {
        // Vũ Thị Hiền - Hóa học
        tutorEmail: "vuthihien@gmail.com",
        courses: [
          {
            subject: "Hóa học",
            level: "THCS",
            title: "Hóa học THCS - Thí nghiệm an toàn và thú vị",
            description:
              "Khóa học Hóa học THCS giúp học sinh làm quen với môn học qua các thí nghiệm đơn giản. Chương trình: Nguyên tử và phân tử, Phản ứng hóa học cơ bản, Hóa học trong đời sống. Tạo hứng thú học tập và hiểu ứng dụng thực tế.",
            hourly_rate: "155000.00",
            teaching_mode: "both",
          },
          {
            subject: "Hóa học",
            level: "THPT",
            title: "Hóa học THPT - Hóa vô cơ và hữu cơ chuyên sâu",
            description:
              "Khóa học Hóa học THPT toàn diện cho kỳ thi THPT và tuyển sinh Đại học. Nội dung: Hóa vô cơ hệ thống, Hóa hữu cơ ứng dụng, Phương pháp giải bài tập, Thí nghiệm minh họa. Có kinh nghiệm phòng thí nghiệm chuyên nghiệp.",
            hourly_rate: "240000.00",
            teaching_mode: "both",
          },
        ],
      },
      {
        // Nguyễn Văn Hải - Sinh học
        tutorEmail: "nguyenvanhai@gmail.com",
        courses: [
          {
            subject: "Sinh học",
            level: "THPT",
            title: "Sinh học THPT - Di truyền và Sinh học phân tử",
            description:
              "Khóa học Sinh học THPT chuyên sâu với trọng tâm Di truyền học và Sinh học phân tử. Nội dung: Cơ chế di truyền, Công nghệ gen, Tiến hóa, Sinh thái học. Giảng viên có bằng Thạc sĩ và nhiều năm nghiên cứu. Chuẩn bị tốt cho thi Đại học.",
            hourly_rate: "260000.00",
            teaching_mode: "both",
          },
          {
            subject: "Sinh học",
            level: "Đại học",
            title: "Sinh học Đại học - Nghiên cứu và Ứng dụng",
            description:
              "Khóa học Sinh học cấp Đại học cho sinh viên chuyên ngành. Nội dung: Sinh học phân tử nâng cao, Công nghệ sinh học, Phương pháp nghiên cứu, Hướng dẫn luận văn. Giảng viên Tiến sĩ với nhiều công trình khoa học quốc tế.",
            hourly_rate: "350000.00",
            teaching_mode: "online",
          },
        ],
      },
      {
        // Hoàng Thị Lan - Lịch sử
        tutorEmail: "hoangthilan@gmail.com",
        courses: [
          {
            subject: "Lịch sử",
            level: "THCS",
            title: "Lịch sử THCS - Câu chuyện dân tộc qua các thời kỳ",
            description:
              "Khóa học Lịch sử THCS với phương pháp kể chuyện sinh động. Chương trình: Lịch sử Việt Nam qua các thời kỳ, Văn hóa truyền thống, Các anh hùng dân tộc, Bài học từ lịch sử. Giúp học sinh yêu thích và ghi nhớ lâu.",
            hourly_rate: "140000.00",
            teaching_mode: "both",
          },
          {
            subject: "Lịch sử",
            level: "THPT",
            title: "Lịch sử THPT - Lịch sử Việt Nam và thế giới hiện đại",
            description:
              "Khóa học luyện thi THPT môn Lịch sử với trọng tâm lịch sử hiện đại. Nội dung: Cách mạng tháng Tám, Kháng chiến chống Pháp-Mỹ, Đổi mới và hội nhập, Lịch sử thế giới. Có kinh nghiệm thực địa tại di tích lịch sử.",
            hourly_rate: "190000.00",
            teaching_mode: "both",
          },
        ],
      },
      {
        // Trần Văn Đức - Địa lý
        tutorEmail: "tranvanduc@gmail.com",
        courses: [
          {
            subject: "Địa lý",
            level: "THCS",
            title: "Địa lý THCS - Khám phá thế giới qua bản đồ",
            description:
              "Khóa học Địa lý THCS với nhiều hình ảnh và bản đồ trực quan. Chương trình: Địa lý tự nhiên Việt Nam, Các vùng miền, Khí hậu và thời tiết, Tài nguyên thiên nhiên. Thường có chuyến tham quan thực địa để học sinh trải nghiệm.",
            hourly_rate: "145000.00",
            teaching_mode: "both",
          },
          {
            subject: "Địa lý",
            level: "THPT",
            title: "Địa lý THPT - Địa lý tự nhiên và kinh tế",
            description:
              "Khóa học Địa lý THPT chuyên sâu với ứng dụng công nghệ GIS. Nội dung: Địa lý tự nhiên hệ thống, Địa lý kinh tế - xã hội, Phân tích bản đồ, Nghiên cứu thực địa. Giảng viên Tiến sĩ với nhiều dự án nghiên cứu thực tế.",
            hourly_rate: "230000.00",
            teaching_mode: "both",
          },
        ],
      },
      {
        // Phạm Thị Thanh - Âm nhạc
        tutorEmail: "phamthithanh@gmail.com",
        courses: [
          {
            subject: "Âm nhạc",
            level: "Tiểu học",
            title: "Âm nhạc thiếu nhi - Âm nhạc vui nhộn cho bé",
            description:
              "Khóa học Âm nhạc cho trẻ em với phương pháp vui nhộn và dễ tiếp cận. Chương trình: Làm quen với nhạc cụ, Hát các bài hát thiếu nhi, Nhịp điệu và giai điệu cơ bản, Trò chơi âm nhạc. Phát triển khiếu âm nhạc tự nhiên cho trẻ.",
            hourly_rate: "120000.00",
            teaching_mode: "both",
          },
          {
            subject: "Âm nhạc",
            level: "Năng khiếu",
            title: "Piano & Thanh nhạc chuyên nghiệp",
            description:
              "Khóa học đào tạo Piano và Thanh nhạc cho học viên có năng khiếu. Chương trình: Kỹ thuật piano nâng cao, Thanh nhạc cổ điển, Biểu diễn và cảm xúc, Chuẩn bị thi cấp. Giảng viên tốt nghiệp xuất sắc Nhạc viện TP.HCM.",
            hourly_rate: "300000.00",
            teaching_mode: "offline",
          },
        ],
      },
      {
        // Đặng Văn Tuấn - Tin học
        tutorEmail: "dangvantuan@gmail.com",
        courses: [
          {
            subject: "Tin học",
            level: "THCS",
            title: "Tin học THCS - Làm quen với lập trình",
            description:
              "Khóa học Tin học THCS từ cơ bản đến nâng cao. Chương trình: Sử dụng máy tính cơ bản, Lập trình Scratch, Python đơn giản, Tư duy thuật toán. Tạo hứng thú và nền tảng vững chắc cho tương lai công nghệ.",
            hourly_rate: "165000.00",
            teaching_mode: "both",
          },
          {
            subject: "Tin học",
            level: "THPT",
            title: "Lập trình Olympic & Competitive Programming",
            description:
              "Khóa học luyện thi Olympic Tin học và lập trình thi đấu. Nội dung: Thuật toán nâng cao, Cấu trúc dữ liệu, Lập trình C++/Python, Giải quyết bài toán logic. Giảng viên có 13 năm kinh nghiệm IT và đào tạo nhiều học sinh đạt giải cao.",
            hourly_rate: "320000.00",
            teaching_mode: "both",
          },
        ],
      },
    ];

    // Create courses for each tutor
    for (const tutorData of coursesData) {
      // Find the tutor profile by email
      const tutorUser = await db
        .select({
          tutorProfileId: schema.tutorProfiles.id,
          email: schema.users.email,
        })
        .from(schema.tutorProfiles)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.tutorProfiles.user_id)
        )
        .where(eq(schema.users.email, tutorData.tutorEmail))
        .limit(1);

      if (tutorUser.length === 0) {
        console.warn(
          `Tutor with email ${tutorData.tutorEmail} not found for courses`
        );
        continue;
      }

      const tutorProfileId = tutorUser[0].tutorProfileId;

      // Create courses for this tutor
      for (const courseData of tutorData.courses) {
        try {
          // Get subject and level IDs
          const subjectId = insertedSubjectsMap.get(courseData.subject);
          const levelId = insertedLevelsMap.get(courseData.level);

          if (!subjectId || !levelId) {
            console.warn(
              `Subject "${courseData.subject}" or level "${courseData.level}" not found for course ${courseData.title}`
            );
            continue;
          }

          // Check if course already exists
          const [existingCourse] = await db
            .select()
            .from(schema.courses)
            .where(
              sql`${schema.courses.tutor_id} = ${tutorProfileId} 
                  AND ${schema.courses.subject_id} = ${subjectId} 
                  AND ${schema.courses.level_id} = ${levelId}
                  AND ${schema.courses.title} = ${courseData.title}`
            );

          if (existingCourse) {
            console.log(
              `Course "${courseData.title}" for ${tutorData.tutorEmail} already exists, skipping...`
            );
            continue;
          }

          // Create the course
          await db.insert(schema.courses).values({
            tutor_id: tutorProfileId,
            subject_id: subjectId,
            level_id: levelId,
            title: courseData.title,
            description: courseData.description,
            hourly_rate: courseData.hourly_rate,
            teaching_mode: courseData.teaching_mode,
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
          });

          console.log(
            `✅ Created course "${courseData.title}" for ${tutorData.tutorEmail} - ${courseData.subject} (${courseData.level})`
          );
        } catch (error) {
          console.error(
            `Error creating course "${courseData.title}" for ${tutorData.tutorEmail}:`,
            error
          );
        }
      }
    }

    console.log("✅ Courses creation completed!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    console.error(
      "Error details:",
      error instanceof Error ? error.message : String(error)
    );

    // Exit with error code to indicate failure
    process.exit(1);
  }
}

seed();
